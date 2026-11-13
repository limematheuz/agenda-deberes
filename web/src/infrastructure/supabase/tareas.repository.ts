import type { TareasRepository } from "../../domain/ports";
import type { NuevaTarea, Tarea, TareaEditable } from "../../domain/entities";
import type { Database } from "./database.types";
import { assertOk, supabase } from "./client";
import {
  enqueueOp,
  flushSyncQueue,
  generateOfflineId,
  isNetworkError,
  isOfflineId,
  readTareasCache,
  registerSyncExecutors,
  writeTareasCache,
} from "../offline/syncManager";

type Row = Database["public"]["Tables"]["tareas"]["Row"];
const FALLBACK_DESC_KEY = "agenda-descripciones-fallback";
const readFallbackDesc = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(FALLBACK_DESC_KEY) ?? "{}"); } catch { return {}; }
};
const saveFallbackDesc = (id: string, descripcion: string | null | undefined): void => {
  const mapa = readFallbackDesc();
  if (descripcion?.trim()) mapa[id] = descripcion.trim();
  else delete mapa[id];
  try { localStorage.setItem(FALLBACK_DESC_KEY, JSON.stringify(mapa)); } catch { /* ignore */ }
};

const fromRow = (r: Row, fallback: Readonly<Record<string, string>>): Tarea => ({
  id: r.id,
  titulo: r.titulo,
  descripcion: r.descripcion ?? fallback[r.id] ?? null,
  tipo: r.tipo,
  fecha: r.fecha,
  hora: r.hora,
  hecha: r.hecha,
  asignaturaId: r.asignatura_id,
});

async function createRemote(n: NuevaTarea): Promise<Tarea> {
  const descripcion = n.descripcion?.trim() || null;
  const base = { titulo: n.titulo, tipo: n.tipo, fecha: n.fecha, hora: n.hora, asignatura_id: n.asignaturaId };
  let res = await supabase.from("tareas").insert({ ...base, descripcion }).select().single();
  if (res.error && res.error.message.includes("descripcion")) {
    res = await supabase.from("tareas").insert(base).select().single();
  }
  assertOk(res.error);
  if (!res.data) throw new Error("No se recibió la tarea creada");
  saveFallbackDesc(res.data.id, descripcion);
  return fromRow({ ...res.data, descripcion: res.data.descripcion ?? descripcion }, readFallbackDesc());
}

async function setDoneRemote(id: string, hecha: boolean): Promise<void> {
  assertOk((await supabase.from("tareas").update({ hecha }).eq("id", id)).error);
}

async function updateRemote(id: string, cambios: TareaEditable): Promise<void> {
  const descripcion = cambios.descripcion === undefined ? undefined : (cambios.descripcion?.trim() || null);
  const base = { titulo: cambios.titulo, tipo: cambios.tipo, fecha: cambios.fecha, hora: cambios.hora, asignatura_id: cambios.asignaturaId };
  const payload = descripcion === undefined ? base : { ...base, descripcion };
  let { error } = await supabase.from("tareas").update(payload).eq("id", id);
  if (error && error.message.includes("descripcion")) {
    ({ error } = await supabase.from("tareas").update(base).eq("id", id));
  }
  assertOk(error);
  if (descripcion !== undefined) saveFallbackDesc(id, descripcion);
}

async function removeRemote(id: string): Promise<void> {
  assertOk((await supabase.from("tareas").delete().eq("id", id)).error);
  saveFallbackDesc(id, null);
}

registerSyncExecutors({
  createTareaRemote: createRemote,
  setTareaDoneRemote: setDoneRemote,
  updateTareaRemote: updateRemote,
  removeTareaRemote: removeRemote,
});

export const supabaseTareasRepository: TareasRepository = {
  async list(): Promise<Tarea[]> {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return readTareasCache();
    }
    try {
      await flushSyncQueue();
      const { data, error } = await supabase.from("tareas").select("*").order("fecha").order("hora", { nullsFirst: true });
      assertOk(error);
      const fallback = readFallbackDesc();
      const lista = (data ?? []).map((r) => fromRow(r, fallback));
      writeTareasCache(lista);
      return lista;
    } catch (err) {
      if (isNetworkError(err)) {
        return readTareasCache();
      }
      throw err;
    }
  },

  async create(n: NuevaTarea): Promise<Tarea> {
    const descripcion = n.descripcion?.trim() || null;
    if (typeof navigator === "undefined" || navigator.onLine) {
      try {
        const creada = await createRemote(n);
        writeTareasCache([...readTareasCache(), creada]);
        return creada;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }

    const tempId = generateOfflineId("tarea");
    const tareaLocal: Tarea = {
      id: tempId,
      titulo: n.titulo,
      descripcion,
      tipo: n.tipo,
      fecha: n.fecha,
      hora: n.hora,
      hecha: false,
      asignaturaId: n.asignaturaId,
    };
    saveFallbackDesc(tempId, descripcion);
    writeTareasCache([...readTareasCache(), tareaLocal]);
    enqueueOp({ kind: "tarea:create", tempId, payload: n, createdAt: Date.now() });
    return tareaLocal;
  },

  async setDone(id: string, hecha: boolean): Promise<void> {
    writeTareasCache(readTareasCache().map((t) => (t.id === id ? { ...t, hecha } : t)));
    if ((typeof navigator === "undefined" || navigator.onLine) && !isOfflineId(id)) {
      try {
        await setDoneRemote(id, hecha);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "tarea:setDone", id, hecha, createdAt: Date.now() });
  },

  async update(id: string, cambios: TareaEditable): Promise<void> {
    const descripcion = cambios.descripcion === undefined ? undefined : (cambios.descripcion?.trim() || null);
    writeTareasCache(
      readTareasCache().map((t) =>
        t.id === id
          ? { ...t, ...cambios, descripcion: descripcion === undefined ? t.descripcion : descripcion }
          : t,
      ),
    );
    if (descripcion !== undefined) saveFallbackDesc(id, descripcion);

    if ((typeof navigator === "undefined" || navigator.onLine) && !isOfflineId(id)) {
      try {
        await updateRemote(id, cambios);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "tarea:update", id, cambios, createdAt: Date.now() });
  },

  async remove(id: string): Promise<void> {
    writeTareasCache(readTareasCache().filter((t) => t.id !== id));
    saveFallbackDesc(id, null);

    if ((typeof navigator === "undefined" || navigator.onLine) && !isOfflineId(id)) {
      try {
        await removeRemote(id);
        return;
      } catch (err) {
        if (!isNetworkError(err)) throw err;
      }
    }
    enqueueOp({ kind: "tarea:remove", id, createdAt: Date.now() });
  },
};
