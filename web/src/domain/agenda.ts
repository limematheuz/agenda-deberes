import type { ISODate, Tarea, TipoTarea } from "./entities";

export type Vista = "mes" | "semana" | "dia";
export type Filtro = TipoTarea | "todos";
/** asignatura: "todas", "ninguna" (sin asignatura) o el id de una asignatura. */
export interface Filtros { tipo: Filtro; asignatura: string; texto: string }

export function agruparPorDia(ts: readonly Tarea[]): Map<ISODate, Tarea[]> {
  const m = new Map<ISODate, Tarea[]>();
  ts.forEach((t) => m.set(t.fecha, [...(m.get(t.fecha) ?? []), t]));
  return m;
}

export function filtrarTareas(ts: readonly Tarea[], f: Filtros, nombreDe: (asignaturaId: string) => string): Tarea[] {
  const s = f.texto.trim().toLowerCase();
  return ts.filter(
    (t) =>
      (f.tipo === "todos" || t.tipo === f.tipo) &&
      (f.asignatura === "todas" || (f.asignatura === "ninguna" ? t.asignaturaId === null : t.asignaturaId === f.asignatura)) &&
      (!s ||
        t.titulo.toLowerCase().includes(s) ||
        (t.descripcion !== null && t.descripcion.toLowerCase().includes(s)) ||
        (t.asignaturaId !== null && nombreDe(t.asignaturaId).toLowerCase().includes(s))),
  );
}
