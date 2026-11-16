// Caso de uso. Depende solo de dominio y de puertos; no sabe nada de Supabase ni de web-push.
import { fechaMadrid, horaMadrid, minutosMadrid, sumarDias } from "../domain/tiempo.ts";
import type { Aviso, Candidata, Mensaje, Slot, Suscripcion, Tarea } from "../domain/types.ts";
import { agruparPorUsuario, candidatas, candidatasPorHora, resumir, resumirPuntual } from "../domain/urgency.ts";

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

async function despacharGrupo(
  deps: { store: AvisosStore; sender: PushSender },
  items: readonly Candidata[],
  resumenFn: (c: readonly Candidata[]) => Mensaje,
  hechos: Set<string>,
): Promise<{ usuarios: number; avisos: number }> {
  const nuevas = items.filter((c) => !hechos.has(`${c.tarea.id}|${c.clave}`));
  if (!nuevas.length) return { usuarios: 0, avisos: 0 };

  let usuarios = 0;
  let avisos = 0;
  for (const [userId, grupo] of agruparPorUsuario(nuevas)) {
    const subs = await deps.store.suscripciones(userId);
    if (!subs.length) continue;

    const mensaje = resumenFn(grupo);
    let entregado = false;
    for (const s of subs) {
      const r = await deps.sender.enviar(s, mensaje);
      if (r === "ok") entregado = true;
      else if (r === "caducada") await deps.store.borrarSuscripcion(s.id);
    }
    if (entregado) {
      usuarios++;
      avisos += grupo.length;
      await deps.store.marcarEnviados(grupo.map((i) => ({ tareaId: i.tarea.id, clave: i.clave })));
    }
  }
  return { usuarios, avisos };
}

export async function enviarAvisos(deps: { store: AvisosStore; sender: PushSender; ahora: Date }): Promise<Resultado> {
  const { store, sender, ahora } = deps;
  const hoy = fechaMadrid(ahora);
  const slot: Slot = horaMadrid(ahora) < 14 ? "am" : "pm";
  const ahoraMin = minutosMadrid(ahora);

  const pendientes = await store.tareasPendientes(sumarDias(hoy, 9));
  if (!pendientes.length) return { usuarios: 0, avisos: 0 };

  const candsPuntuales = candidatasPorHora(pendientes, hoy, ahoraMin);
  const candsResumen = candidatas(pendientes, hoy, slot);
  const todas = [...candsPuntuales, ...candsResumen];
  if (!todas.length) return { usuarios: 0, avisos: 0 };

  const previos = await store.avisosEnviados([...new Set(todas.map((c) => c.tarea.id))]);
  const hechos = new Set(previos.map((a) => `${a.tareaId}|${a.clave}`));

  const rPuntual = await despacharGrupo({ store, sender }, candsPuntuales, resumirPuntual, hechos);
  const rResumen = await despacharGrupo({ store, sender }, candsResumen, resumir, hechos);

  return {
    usuarios: Math.max(rPuntual.usuarios, rResumen.usuarios),
    avisos: rPuntual.avisos + rResumen.avisos,
  };
}
