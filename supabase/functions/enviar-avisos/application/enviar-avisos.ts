// Caso de uso. Depende solo de dominio y de puertos; no sabe nada de Supabase ni de web-push.
import { fechaMadrid, horaMadrid, sumarDias } from "../domain/tiempo.ts";
import type { Aviso, Mensaje, Slot, Suscripcion, Tarea } from "../domain/types.ts";
import { agruparPorUsuario, candidatas, resumir } from "../domain/urgency.ts";

export type ResultadoEnvio = "ok" | "caducada" | "error";

export interface AvisosStore {
  tareasPendientes(hasta: string): Promise<Tarea[]>;
  avisosEnviados(tareaIds: string[]): Promise<Aviso[]>;
  suscripciones(userId: string): Promise<Suscripcion[]>;
  marcarEnviados(avisos: Aviso[]): Promise<void>;
  borrarSuscripcion(id: string): Promise<void>;
}
export interface PushSender { enviar(s: Suscripcion, m: Mensaje): Promise<ResultadoEnvio> }

export interface Resultado { usuarios: number; avisos: number }

export async function enviarAvisos(deps: { store: AvisosStore; sender: PushSender; ahora: Date }): Promise<Resultado> {
  const { store, sender, ahora } = deps;
  const hoy = fechaMadrid(ahora);
  const slot: Slot = horaMadrid(ahora) < 14 ? "am" : "pm";

  const cands = candidatas(await store.tareasPendientes(sumarDias(hoy, 9)), hoy, slot);
  if (!cands.length) return { usuarios: 0, avisos: 0 };

  const previos = await store.avisosEnviados(cands.map((c) => c.tarea.id));
  const hechos = new Set(previos.map((a) => `${a.tareaId}|${a.clave}`));
  const nuevas = cands.filter((c) => !hechos.has(`${c.tarea.id}|${c.clave}`));

  let usuarios = 0;
  let avisos = 0;
  for (const [userId, items] of agruparPorUsuario(nuevas)) {
    const subs = await store.suscripciones(userId);
    if (!subs.length) continue; // sin dispositivos: no se marca, se reintenta en el siguiente ciclo

    const mensaje = resumir(items);
    let entregado = false;
    for (const s of subs) {
      const r = await sender.enviar(s, mensaje);
      if (r === "ok") entregado = true;
      else if (r === "caducada") await store.borrarSuscripcion(s.id);
    }
    if (entregado) {
      usuarios++;
      avisos += items.length;
      await store.marcarEnviados(items.map((i) => ({ tareaId: i.tarea.id, clave: i.clave })));
    }
  }
  return { usuarios, avisos }; // avisos = tareas notificadas de verdad
}
