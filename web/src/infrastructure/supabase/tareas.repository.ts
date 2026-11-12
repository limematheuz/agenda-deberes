import type { TareasRepository } from "../../domain/ports";
import type { NuevaTarea, Tarea, TareaEditable } from "../../domain/entities";
import type { Database } from "./database.types";
import { assertOk, supabase } from "./client";

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

export const supabaseTareasRepository: TareasRepository = {
  async list(): Promise<Tarea[]> {
    const { data, error } = await supabase.from("tareas").select("*").order("fecha").order("hora", { nullsFirst: true });
    assertOk(error);
    const fallback = readFallbackDesc();
    return (data ?? []).map((r) => fromRow(r, fallback));
  },
  async create(n: NuevaTarea): Promise<Tarea> {
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
  },
  async setDone(id: string, hecha: boolean): Promise<void> {
    assertOk((await supabase.from("tareas").update({ hecha }).eq("id", id)).error);
  },
  async update(id: string, cambios: TareaEditable): Promise<void> {
    const descripcion = cambios.descripcion === undefined ? undefined : (cambios.descripcion?.trim() || null);
    const base = { titulo: cambios.titulo, tipo: cambios.tipo, fecha: cambios.fecha, hora: cambios.hora, asignatura_id: cambios.asignaturaId };
    const payload = descripcion === undefined ? base : { ...base, descripcion };
    let { error } = await supabase.from("tareas").update(payload).eq("id", id);
    if (error && error.message.includes("descripcion")) {
      ({ error } = await supabase.from("tareas").update(base).eq("id", id));
    }
    assertOk(error);
    if (descripcion !== undefined) saveFallbackDesc(id, descripcion);
  },
  async remove(id: string): Promise<void> {
    assertOk((await supabase.from("tareas").delete().eq("id", id)).error);
    saveFallbackDesc(id, null);
  },
};
