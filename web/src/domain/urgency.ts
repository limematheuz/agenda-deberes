import { daysUntil } from "./dates";
import type { ISODate, Tarea } from "./entities";

export type Urgency = "ninguna" | "baja" | "media" | "alta" | "critica" | "hoy" | "vencida";
const ORDER: readonly Urgency[] = ["ninguna", "baja", "media", "alta", "critica", "hoy", "vencida"];
export const rank = (u: Urgency): number => ORDER.indexOf(u);

/**
 * Escala legible: rojo hasta 3 días, naranja durante la semana y azul para
 * planificación. El tipo de tarea no altera el plazo: evita sorpresas.
 */
export function urgencyOf(t: Tarea): Urgency {
  if (t.hecha) return "ninguna";
  const d = daysUntil(t.fecha);
  if (d < 0) return "vencida";
  if (d === 0) return "hoy";
  if (d <= 1) return "critica";
  if (d <= 3) return "alta";
  if (d <= 7) return "media";
  return "baja";
}

export const maxUrgency = (ts: readonly Tarea[]): Urgency =>
  ts.reduce<Urgency>((m, t) => (rank(urgencyOf(t)) > rank(m) ? urgencyOf(t) : m), "ninguna");

/** Las entregas rojas tienen presencia persistente, incluido el plazo de 3 días. */
export const isUrgent = (t: Tarea): boolean => rank(urgencyOf(t)) >= rank("alta");

export function describeDays(fecha: ISODate): string {
  const d = daysUntil(fecha);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d > 1) return `En ${d} días`;
  return d === -1 ? "Ayer" : `Hace ${-d} días`;
}
