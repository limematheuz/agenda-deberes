export type Nivel = "media" | "alta" | "critica" | "hoy" | "vencida";
export type Slot = "am" | "pm";

export interface Tarea { id: string; user_id: string; titulo: string; tipo: string; fecha: string }
export interface Suscripcion { id: string; endpoint: string; p256dh: string; auth: string }
export interface Aviso { tareaId: string; clave: string }
export interface Candidata { tarea: Tarea; dias: number; nivel: Nivel; clave: string }
export interface Mensaje { title: string; body: string; tag: string; url: string }
