export type ISODate = string; // YYYY-MM-DD
export type TipoTarea = string;

export const TIPOS: ReadonlyArray<{ value: TipoTarea; label: string }> = [
  { value: "ejercicio", label: "Ejercicios" },
  { value: "examen", label: "Examen" },
  { value: "practica", label: "Prácticas" },
  { value: "otro", label: "Otro" },
];
export const tipoLabel = (t: TipoTarea): string => TIPOS.find((x) => x.value === t)?.label ?? t;

export interface Asignatura { id: string; nombre: string; color: string; orden: number }
export interface Tarea {
  id: string;
  titulo: string;
  tipo: TipoTarea;
  fecha: ISODate;
  hora: string | null; // HH:MM; null = tarea sin hora concreta
  hecha: boolean;
  asignaturaId: string | null; // null = recordatorio general, sin asignatura
}
export type NuevaTarea = Omit<Tarea, "id" | "hecha">;
export type TareaEditable = Pick<Tarea, "titulo" | "tipo" | "fecha" | "hora" | "asignaturaId">;
export type NuevaAsignatura = Omit<Asignatura, "id" | "orden">;
