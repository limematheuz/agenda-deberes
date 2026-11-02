import { daysUntil } from "./dates";
import type { ISODate, Tarea } from "./entities";

export type Urgency = "ninguna" | "baja" | "media" | "alta" | "critica" | "hoy" | "vencida";
const ORDER: readonly Urgency[] = ["ninguna", "baja", "media", "alta", "critica", "hoy", "vencida"];
export const rank = (u: Urgency): number => ORDER.indexOf(u);

/** Cuanto más cerca la fecha, más urgencia. Los exámenes escalan 2 días antes. */
export function urgencyOf(t: Tarea): Urgency {
  if (t.hecha) return "ninguna";
  const d = daysUntil(t.fecha);
  const extra = t.tipo === "examen" ? 2 : 0;
  if (d < 0) return "vencida";
  if (d === 0) return "hoy";
  if (d <= 1 + extra) return "critica";
  if (d <= 3 + extra) return "alta";
  if (d <= 7 + extra) return "media";
  return "baja";
}

export const maxUrgency = (ts: readonly Tarea[]): Urgency =>
  ts.reduce<Urgency>((m, t) => (rank(urgencyOf(t)) > rank(m) ? urgencyOf(t) : m), "ninguna");

export const isUrgent = (t: Tarea): boolean => rank(urgencyOf(t)) >= rank("critica");

export function describeDays(fecha: ISODate): string {
  const d = daysUntil(fecha);
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  if (d > 1) return `En ${d} días`;
  return d === -1 ? "Ayer" : `Hace ${-d} días`;
}
