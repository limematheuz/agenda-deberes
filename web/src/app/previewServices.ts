import { addDays, todayISO } from "../domain/dates";
import type { Asignatura, NuevaAsignatura, NuevaTarea, Tarea, TareaEditable } from "../domain/entities";
import type { Services } from "../domain/ports";

/** Datos efímeros para revisar el diseño con ?preview=1 en desarrollo. */
let asignaturas: Asignatura[] = [
  { id: "mat", nombre: "Trabajo", color: "#3b82f6", orden: 0 },
  { id: "his", nombre: "Personal", color: "#ec4899", orden: 1 },
  { id: "ing", nombre: "Proyectos", color: "#a855f7", orden: 2 },
  { id: "bio", nombre: "Salud y deporte", color: "#10b981", orden: 3 },
];
let sesionActiva = true;
const authListeners = new Set<(s: boolean) => void>();
const hoy = todayISO();
let tareas: Tarea[] = [
  { id: "1", titulo: "Revisión de propuesta trimestral", descripcion: "Documento compartido en https://drive.google.com/drive/folders/ejemplo", tipo: "ejercicio", fecha: hoy, hora: "09:00", hecha: false, asignaturaId: "mat" },
  { id: "2", titulo: "Actualizar documentación del equipo", descripcion: "Subir documento compartido en https://docs.google.com/document/d/ejemplo", tipo: "practica", fecha: hoy, hora: "10:30", hecha: false, asignaturaId: "his" },
  { id: "3", titulo: "Planificar objetivos de la semana", descripcion: null, tipo: "ejercicio", fecha: addDays(hoy, 1), hora: "11:00", hecha: false, asignaturaId: "ing" },
  { id: "4", titulo: "Presentación de avance de proyecto", descripcion: null, tipo: "practica", fecha: addDays(hoy, 2), hora: "12:00", hecha: false, asignaturaId: "bio" },
  { id: "5", titulo: "Entrega de informe mensual", descripcion: null, tipo: "examen", fecha: addDays(hoy, 3), hora: "13:30", hecha: false, asignaturaId: "mat" },
  { id: "6", titulo: "Revisión semanal", descripcion: null, tipo: "otro", fecha: addDays(hoy, 4), hora: "15:00", hecha: false, asignaturaId: "ing" },
];

export const previewServices: Services = {
  tareas: {
    list: async () => tareas,
    create: async (n: NuevaTarea) => {
      const t: Tarea = { ...n, descripcion: n.descripcion?.trim() || null, id: crypto.randomUUID(), hecha: false };
      tareas = [...tareas, t];
      return t;
    },
    setDone: async (id, hecha) => { tareas = tareas.map((t) => t.id === id ? { ...t, hecha } : t); },
    update: async (id: string, cambios: TareaEditable) => {
      tareas = tareas.map((t) => t.id === id ? { ...t, ...cambios, descripcion: cambios.descripcion === undefined ? t.descripcion : (cambios.descripcion?.trim() || null) } : t);
    },
    remove: async (id) => { tareas = tareas.filter((t) => t.id !== id); },
  },
  asignaturas: {
    list: async () => asignaturas,
    create: async (n: NuevaAsignatura) => {
      const a = { ...n, id: crypto.randomUUID(), orden: asignaturas.length };
      asignaturas = [...asignaturas, a];
      return a;
    },
    update: async (id, cambios) => { asignaturas = asignaturas.map((a) => a.id === id ? { ...a, ...cambios } : a); },
    remove: async (id) => { asignaturas = asignaturas.filter((a) => a.id !== id); },
    reorder: async (ids) => { const porId = new Map(asignaturas.map((a) => [a.id, a])); asignaturas = ids.map((id, orden) => ({ ...porId.get(id)!, orden })); },
  },
  auth: {
    haySesion: async () => sesionActiva,
    obtenerEmail: async () => (sesionActiva ? "estudiante@agenda.es" : null),
    onChange: (cb) => {
      authListeners.add(cb);
      return () => authListeners.delete(cb);
    },
    signIn: async () => {
      sesionActiva = true;
      authListeners.forEach((cb) => cb(true));
    },
    signUp: async () => {
      sesionActiva = true;
      authListeners.forEach((cb) => cb(true));
      return true;
    },
    signOut: async () => {
      sesionActiva = false;
      authListeners.forEach((cb) => cb(false));
    },
  },
  push: { estado: async () => "no-soportado", activar: async () => "no-soportado" },
  userData: {
    load: async () => {
      try {
        const raw = localStorage.getItem("agenda-cloud-state-cache");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    save: async (parcial) => {
      try {
        const prev = JSON.parse(localStorage.getItem("agenda-cloud-state-cache") ?? "{}");
        localStorage.setItem("agenda-cloud-state-cache", JSON.stringify({ ...prev, ...parcial }));
      } catch {
        // ignore
      }
    },
  },
};
