export type ISODate = string; // YYYY-MM-DD
export type TipoTarea = string;

export const TIPOS: ReadonlyArray<{ value: TipoTarea; label: string }> = [
  { value: "ejercicio", label: "Tareas" },
  { value: "examen", label: "Importante" },
  { value: "practica", label: "Proyectos" },
  { value: "otro", label: "Otro" },
];
export const tipoLabel = (t: TipoTarea): string => TIPOS.find((x) => x.value === t)?.label ?? t;

export interface Asignatura { id: string; nombre: string; color: string; orden: number }
export interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  tipo: TipoTarea;
  fecha: ISODate;
  hora: string | null; // HH:MM; null = tarea sin hora concreta
  hecha: boolean;
  asignaturaId: string | null; // null = recordatorio general, sin asignatura
}
export type NuevaTarea = Omit<Tarea, "id" | "hecha" | "descripcion"> & { descripcion?: string | null };
export type TareaEditable = Pick<Tarea, "titulo" | "tipo" | "fecha" | "hora" | "asignaturaId"> & { descripcion?: string | null };
export type NuevaAsignatura = Omit<Asignatura, "id" | "orden">;

export interface ClaseSemanal {
  id: string;
  diaSemana: number; // 1 = Lunes .. 5 = Viernes (Date.getDay())
  horaInicio: string; // HH:MM
  horaFin: string; // HH:MM
  asignaturaId: string;
  titulo?: string;
  color?: string;
  aula?: string | null;
}

export interface ItemChecklist {
  id: string;
  texto: string;
  hecho: boolean;
}

export interface Recordatorio {
  id: string;
  titulo: string;
  nota: string;
  items: ItemChecklist[];
  fechaAviso: ISODate | null;
  horaAviso: string | null;
  hecho: boolean;
  creadoEn: string;
}

export interface NotaBloc {
  id: string;
  titulo: string;
  contenido: string;
  items: ItemChecklist[];
  color: string;
  actualizadoEn: string;
}
