// Reglas puras (sin red ni base de datos). Misma escala que web/src/domain/urgency.ts.
// 4–7 días: aviso naranja una vez · 2–3 días: rojo diario · hoy/mañana: rojo dos veces.
import { diasHasta } from "./tiempo.ts";
import type { Candidata, Mensaje, Nivel, Slot, Tarea } from "./types.ts";

const ORDEN: readonly Nivel[] = ["media", "alta", "critica", "hoy", "vencida"];
const SLOTS: Record<Nivel, readonly Slot[]> = { media: ["am"], alta: ["am"], critica: ["am", "pm"], hoy: ["am", "pm"], vencida: ["am"] };

export function nivelDe(_tipo: string, dias: number): Nivel | null {
  if (dias < 0) return "vencida";
  if (dias === 0) return "hoy";
  if (dias <= 1) return "critica";
  if (dias <= 3) return "alta";
  if (dias <= 7) return "media";
  return null;
}

export const claveDe = (nivel: Nivel, hoy: string, slot: Slot): string => (nivel === "media" ? "media" : `${nivel}:${hoy}:${slot}`);

/** Tareas que toca avisar ahora (según su nivel y la franja del día). */
export function candidatas(tareas: readonly Tarea[], hoy: string, slot: Slot): Candidata[] {
  return tareas.flatMap((tarea) => {
    const dias = diasHasta(hoy, tarea.fecha);
    const nivel = nivelDe(tarea.tipo, dias);
    if (!nivel || !SLOTS[nivel].includes(slot)) return [];
    return [{ tarea, dias, nivel, clave: claveDe(nivel, hoy, slot) }];
  });
}

export function agruparPorUsuario(items: readonly Candidata[]): Map<string, Candidata[]> {
  const m = new Map<string, Candidata[]>();
  items.forEach((c) => m.set(c.tarea.user_id, [...(m.get(c.tarea.user_id) ?? []), c]));
  return m;
}

const cuando = (d: number): string => (d < 0 ? "vencida" : d === 0 ? "hoy" : d === 1 ? "mañana" : `en ${d} días`);

/** Un único aviso resumen por usuario, con lo más urgente primero. */
export function resumir(items: readonly Candidata[]): Mensaje {
  const orden = [...items].sort((a, b) => ORDEN.indexOf(b.nivel) - ORDEN.indexOf(a.nivel) || a.dias - b.dias);
  return {
    title: orden.length === 1 ? "Entrega cerca" : `${orden.length} entregas cerca`,
    body: orden.slice(0, 3).map((i) => `${i.tarea.titulo} (${cuando(i.dias)})`).join("\n"),
    tag: "entregas",
    url: "/",
  };
}
