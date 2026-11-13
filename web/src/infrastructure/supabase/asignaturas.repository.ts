import type { AsignaturasRepository } from "../../domain/ports";
import type { Asignatura, NuevaAsignatura } from "../../domain/entities";
import type { Database } from "./database.types";
import { assertOk, supabase } from "./client";
import {
  enqueueOp,
  flushSyncQueue,
  generateOfflineId,
  isNetworkError,
  isOfflineId,
  readAsignaturasCache,
  registerSyncExecutors,
  writeAsignaturasCache,
} from "../offline/syncManager";

type Row = Database["public"]["Tables"]["asignaturas"]["Row"];
const fromRow = (r: Row): Asignatura => ({ id: r.id, nombre: r.nombre, color: r.color, orden: r.orden });

async function createRemote(n: NuevaAsignatura): Promise<Asignatura> {
  const { data, error } = await supabase.from("asignaturas").insert(n).select("*").single();
  assertOk(error);
  if (!data) throw new Error("No se recibió la categoría creada");
  return fromRow(data);
}

async function updateRemote(id: string, cambios: Pick<Asignatura, "nombre" | "color">): Promise<void> {
  assertOk((await supabase.from("asignaturas").update(cambios).eq("id", id)).error);
}

async function removeRemote(id: string): Promise<void> {
  assertOk((await supabase.from("asignaturas").delete().eq("id", id)).error);
}

async function reorderRemote(ids: readonly string[]): Promise<void> {
  await Promise.all(
    ids.map(async (id, orden) => {
      assertOk((await supabase.from("asignaturas").update({ orden }).eq("id", id)).error);
    }),
  );
}

registerSyncExecutors({
  createAsignaturaRemote: createRemote,
  updateAsignaturaRemote: updateRemote,
  removeAsignaturaRemote: removeRemote,
  reorderAsignaturasRemote: reorderRemote,
});

export const supabaseAsignaturasRepository: AsignaturasRepository = {
  async list(): Promise<Asignatura[]> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return readAsignaturasCache();
    }
    try {
      await flushSyncQueue();
      const { data, error } = await supabase.from("asignaturas").select("*").order("orden").order("created_at");
      assertOk(error);
      const lista = (data ?? []).map(fromRow);
      writeAsignaturasCache(lista);
      return lista;
    } catch (err) {
      if (isNetworkError(err)) {
        return readAsignaturasCache();
      }
      throw err;
    }
  },

  async create(n: NuevaAsignatura): Promise<Asignatura> {
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const creada = await createRemote(n);
        writeAsignaturasCache([...readAsignaturasCache(), creada]);
        return creada;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const tempId = generateOfflineId("asig");
    const actuales = readAsignaturasCache();
    const localAsig: Asignatura = {
      id: tempId,
      nombre: n.nombre,
      color: n.color,
      orden: actuales.length,
    };
    writeAsignaturasCache([...actuales, localAsig]);
    enqueueOp({ kind: "asignatura:create", tempId, payload: n, createdAt: Date.now() });
    return localAsig;
  },

  async update(id: string, cambios: Pick<Asignatura, "nombre" | "color">): Promise<void> {
    writeAsignaturasCache(readAsignaturasCache().map((a) => (a.id === id ? { ...a, ...cambios } : a)));
    if ((typeof navigator === "undefined" || navigator.onLine) && !isOfflineId(id)) {
      try {
        await updateRemote(id, cambios);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "asignatura:update", id, cambios, createdAt: Date.now() });
  },

  async remove(id: string): Promise<void> {
    writeAsignaturasCache(readAsignaturasCache().filter((a) => a.id !== id));
    if ((typeof navigator === "undefined" || navigator.onLine) && !isOfflineId(id)) {
      try {
        await removeRemote(id);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "asignatura:remove", id, createdAt: Date.now() });
  },

  async reorder(ids: readonly string[]): Promise<void> {
    const porId = new Map(readAsignaturasCache().map((a) => [a.id, a]));
    const reordenadas = ids.map((id, orden) => {
      const item = porId.get(id);
      return item ? { ...item, orden } : null;
    }).filter((x): x is Asignatura => x !== null);
    if (reordenadas.length > 0) writeAsignaturasCache(reordenadas);

    const tieneTemporales = ids.some((id) => isOfflineId(id));
    if ((typeof navigator === "undefined" || navigator.onLine) && !tieneTemporales) {
      try {
        await reorderRemote(ids);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "asignatura:reorder", ids: [...ids], createdAt: Date.now() });
  },
};
