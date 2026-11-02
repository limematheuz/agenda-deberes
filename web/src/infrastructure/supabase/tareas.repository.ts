import type { TareasRepository } from "../../domain/ports";
import type { NuevaTarea, Tarea, TareaEditable } from "../../domain/entities";
import type { Database } from "./database.types";
import { assertOk, supabase } from "./client";

type Row = Database["public"]["Tables"]["tareas"]["Row"];
const fromRow = (r: Row): Tarea => ({
  id: r.id, titulo: r.titulo, tipo: r.tipo, fecha: r.fecha, hora: r.hora, hecha: r.hecha, asignaturaId: r.asignatura_id,
});

export const supabaseTareasRepository: TareasRepository = {
  async list(): Promise<Tarea[]> {
    const { data, error } = await supabase.from("tareas").select("*").order("fecha").order("hora", { nullsFirst: true });
    assertOk(error);
    return (data ?? []).map(fromRow);
  },
  async create(n: NuevaTarea): Promise<Tarea> {
    const { data, error } = await supabase
      .from("tareas")
      .insert({ titulo: n.titulo, tipo: n.tipo, fecha: n.fecha, hora: n.hora, asignatura_id: n.asignaturaId })
      .select()
      .single();
    assertOk(error);
    if (!data) throw new Error("No se recibió la tarea creada");
    return fromRow(data);
  },
  async setDone(id: string, hecha: boolean): Promise<void> {
    assertOk((await supabase.from("tareas").update({ hecha }).eq("id", id)).error);
  },
  async update(id: string, cambios: TareaEditable): Promise<void> {
    assertOk((await supabase.from("tareas").update({ titulo: cambios.titulo, tipo: cambios.tipo, fecha: cambios.fecha, hora: cambios.hora, asignatura_id: cambios.asignaturaId }).eq("id", id)).error);
  },
  async remove(id: string): Promise<void> {
    assertOk((await supabase.from("tareas").delete().eq("id", id)).error);
  },
};
