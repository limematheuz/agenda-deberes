import { addDays, todayISO } from "../domain/dates";
import type { Asignatura, NuevaAsignatura, NuevaTarea, Tarea, TareaEditable } from "../domain/entities";
import type { Services } from "../domain/ports";

/** Datos efímeros para revisar el diseño con ?preview=1 en desarrollo. */
let asignaturas: Asignatura[] = [
  { id: "mat", nombre: "Matemáticas", color: "#4f8bd6" },
  { id: "his", nombre: "Historia", color: "#af5a92" },
  { id: "ing", nombre: "Inglés", color: "#487bdb" },
  { id: "bio", nombre: "Biología", color: "#3b9a73" },
];
const hoy = todayISO();
let tareas: Tarea[] = [
  { id: "1", titulo: "Problemas del tema 4", tipo: "ejercicio", fecha: hoy, hora: "09:00", hecha: false, asignaturaId: "mat" },
  { id: "2", titulo: "Comentario de texto", tipo: "practica", fecha: hoy, hora: "10:30", hecha: false, asignaturaId: "his" },
  { id: "3", titulo: "Repasar vocabulario", tipo: "ejercicio", fecha: addDays(hoy, 1), hora: "11:00", hecha: false, asignaturaId: "ing" },
  { id: "4", titulo: "Preparar exposición", tipo: "practica", fecha: addDays(hoy, 2), hora: "12:00", hecha: false, asignaturaId: "bio" },
  { id: "5", titulo: "Examen de álgebra", tipo: "examen", fecha: addDays(hoy, 3), hora: "13:30", hecha: false, asignaturaId: "mat" },
  { id: "6", titulo: "Lectura semanal", tipo: "otro", fecha: addDays(hoy, 4), hora: "15:00", hecha: false, asignaturaId: "ing" },
];

export const previewServices: Services = {
  tareas: {
    list: async () => tareas,
    create: async (n: NuevaTarea) => {
      const t = { ...n, id: crypto.randomUUID(), hecha: false };
      tareas = [...tareas, t];
      return t;
    },
    setDone: async (id, hecha) => { tareas = tareas.map((t) => t.id === id ? { ...t, hecha } : t); },
    update: async (id: string, cambios: TareaEditable) => { tareas = tareas.map((t) => t.id === id ? { ...t, ...cambios } : t); },
    remove: async (id) => { tareas = tareas.filter((t) => t.id !== id); },
  },
  asignaturas: {
    list: async () => asignaturas,
    create: async (n: NuevaAsignatura) => {
      const a = { ...n, id: crypto.randomUUID() };
      asignaturas = [...asignaturas, a];
      return a;
    },
    remove: async (id) => { asignaturas = asignaturas.filter((a) => a.id !== id); },
  },
  auth: { haySesion: async () => true, onChange: () => () => undefined, signIn: async () => undefined, signUp: async () => true, signOut: async () => undefined },
  push: { estado: async () => "no-soportado", activar: async () => "no-soportado" },
};
