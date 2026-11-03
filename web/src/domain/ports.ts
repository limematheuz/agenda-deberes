// Puertos: lo que la aplicación necesita del exterior. La infraestructura los implementa.
import type { Asignatura, NuevaAsignatura, NuevaTarea, Tarea, TareaEditable } from "./entities";

export type EstadoPush = "no-soportado" | "bloqueado" | "inactivo" | "activo";

export interface TareasRepository {
  list(): Promise<Tarea[]>;
  create(n: NuevaTarea): Promise<Tarea>;
  setDone(id: string, hecha: boolean): Promise<void>;
  update(id: string, cambios: TareaEditable): Promise<void>;
  remove(id: string): Promise<void>;
}
export interface AsignaturasRepository {
  list(): Promise<Asignatura[]>;
  create(n: NuevaAsignatura): Promise<Asignatura>;
  remove(id: string): Promise<void>;
  reorder(ids: readonly string[]): Promise<void>;
}
export interface AuthGateway {
  haySesion(): Promise<boolean>;
  onChange(cb: (autenticado: boolean) => void): () => void;
  signIn(email: string, password: string): Promise<void>;
  /** true si la sesión queda iniciada; false si hay que confirmar el correo. */
  signUp(email: string, password: string): Promise<boolean>;
  signOut(): Promise<void>;
}
export interface PushGateway {
  estado(): Promise<EstadoPush>;
  activar(): Promise<EstadoPush>;
}
export interface Services {
  tareas: TareasRepository;
  asignaturas: AsignaturasRepository;
  auth: AuthGateway;
  push: PushGateway;
}
