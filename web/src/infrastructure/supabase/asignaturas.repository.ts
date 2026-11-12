import type { AsignaturasRepository } from "../../domain/ports";
import type { Asignatura, NuevaAsignatura } from "../../domain/entities";
import type { Database } from "./database.types";
import { assertOk, supabase } from "./client";

type Row = Database["public"]["Tables"]["asignaturas"]["Row"];
const fromRow = (r: Row): Asignatura => ({ id: r.id, nombre: r.nombre, color: r.color, orden: r.orden });

export const supabaseAsignaturasRepository: AsignaturasRepository = {
  async list(): Promise<Asignatura[]> {
    const { data, error } = await supabase.from("asignaturas").select("*").order("orden").order("created_at");
    assertOk(error);
    return (data ?? []).map(fromRow);
  },
  async create(n: NuevaAsignatura): Promise<Asignatura> {
    const { data, error } = await supabase.from("asignaturas").insert(n).select("*").single();
    assertOk(error);
    if (!data) throw new Error("No se recibió la categoría creada");
    return fromRow(data);
  },
  async update(id: string, cambios: Pick<Asignatura, "nombre" | "color">): Promise<void> {
    assertOk((await supabase.from("asignaturas").update(cambios).eq("id", id)).error);
  },
  async remove(id: string): Promise<void> {
    assertOk((await supabase.from("asignaturas").delete().eq("id", id)).error);
  },
  async reorder(ids: readonly string[]): Promise<void> {
    await Promise.all(ids.map(async (id, orden) => {
      assertOk((await supabase.from("asignaturas").update({ orden }).eq("id", id)).error);
    }));
  },
};
