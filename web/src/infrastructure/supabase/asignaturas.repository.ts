import type { AsignaturasRepository } from "../../domain/ports";
import type { Asignatura, NuevaAsignatura } from "../../domain/entities";
import { assertOk, supabase } from "./client";

export const supabaseAsignaturasRepository: AsignaturasRepository = {
  async list(): Promise<Asignatura[]> {
    const { data, error } = await supabase.from("asignaturas").select("id, nombre, color").order("nombre");
    assertOk(error);
    return data ?? [];
  },
  async create(n: NuevaAsignatura): Promise<Asignatura> {
    const { data, error } = await supabase.from("asignaturas").insert(n).select("id, nombre, color").single();
    assertOk(error);
    if (!data) throw new Error("No se recibió la asignatura creada");
    return data;
  },
  async remove(id: string): Promise<void> {
    assertOk((await supabase.from("asignaturas").delete().eq("id", id)).error);
  },
};
