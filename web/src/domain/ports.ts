// Puertos: lo que la aplicación necesita del exterior. La infraestructura los implementa.
import type { Asignatura, ClaseSemanal, NotaBloc, NuevaAsignatura, NuevaTarea, Recordatorio, Tarea, TareaEditable } from "./entities";

export type EstadoPush = "no-soportado" | "bloqueado" | "inactivo" | "activo";

export interface AgendaCloudState {
  perfil?: { nombre: string; curso: string; email: string; color: string };
  categorias?: Array<{ id: string; nombre: string; abierta: boolean }>;
  categoriaPorAsignatura?: Record<string, string>;
  clasesSemanales?: ClaseSemanal[];
  mostrarClasesEnCalendario?: boolean;
  recordatorios?: Recordatorio[];
  notasBloc?: NotaBloc[];
  coloresBloc?: string[];
  updatedAt?: string;
}

export interface UserDataGateway {
  load(): Promise<AgendaCloudState | null>;
  save(parcial: Partial<AgendaCloudState>): Promise<void>;
}

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
  update(id: string, cambios: Pick<Asignatura, "nombre" | "color">): Promise<void>;
  remove(id: string): Promise<void>;
  reorder(ids: readonly string[]): Promise<void>;
}
export interface AuthGateway {
  haySesion(): Promise<boolean>;
  obtenerEmail(): Promise<string | null>;
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
  userData: UserDataGateway;
}
