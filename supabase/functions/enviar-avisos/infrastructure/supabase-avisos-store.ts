import type { SupabaseClient } from "jsr:@supabase/supabase-js@2.118.0";
import type { AvisosStore } from "../application/enviar-avisos.ts";
import type { Aviso, Suscripcion, Tarea } from "../domain/types.ts";

const ok = (error: { message: string } | null): void => {
  if (error) throw new Error(error.message);
};

/** Adaptador del puerto AvisosStore sobre Supabase (con la service role). */
export class SupabaseAvisosStore implements AvisosStore {
  constructor(private readonly db: SupabaseClient) {}

  async tareasPendientes(hasta: string): Promise<Tarea[]> {
    const { data, error } = await this.db.from("tareas").select("id,user_id,titulo,tipo,fecha").eq("hecha", false).lte("fecha", hasta);
    ok(error);
    return (data ?? []) as Tarea[];
  }
  async avisosEnviados(tareaIds: string[]): Promise<Aviso[]> {
    const { data, error } = await this.db.from("avisos_enviados").select("tarea_id,clave").in("tarea_id", tareaIds);
    ok(error);
    return (data ?? []).map((r: { tarea_id: string; clave: string }) => ({ tareaId: r.tarea_id, clave: r.clave }));
  }
  async suscripciones(userId: string): Promise<Suscripcion[]> {
    const { data, error } = await this.db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId);
    ok(error);
    return (data ?? []) as Suscripcion[];
  }
  async marcarEnviados(avisos: Aviso[]): Promise<void> {
    ok((await this.db.from("avisos_enviados").upsert(avisos.map((a) => ({ tarea_id: a.tareaId, clave: a.clave })))).error);
  }
  async borrarSuscripcion(id: string): Promise<void> {
    ok((await this.db.from("push_subscriptions").delete().eq("id", id)).error);
  }
}
