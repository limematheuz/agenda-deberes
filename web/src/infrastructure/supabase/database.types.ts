import type { TipoTarea } from "../../domain/entities";

// Refleja supabase/migrations/0001_init.sql. Se puede regenerar con `supabase gen types typescript`.
export type Database = {
  public: {
    Tables: {
      asignaturas: {
        Row: { id: string; user_id: string; nombre: string; color: string; orden: number; created_at: string };
        Insert: { id?: string; user_id?: string; nombre: string; color?: string; orden?: number; created_at?: string };
        Update: { id?: string; user_id?: string; nombre?: string; color?: string; orden?: number; created_at?: string };
        Relationships: [];
      };
      tareas: {
        Row: { id: string; user_id: string; asignatura_id: string | null; titulo: string; tipo: TipoTarea; fecha: string; hora: string | null; hecha: boolean; created_at: string };
        Insert: { id?: string; user_id?: string; asignatura_id?: string | null; titulo: string; tipo?: TipoTarea; fecha: string; hora?: string | null; hecha?: boolean; created_at?: string };
        Update: { id?: string; user_id?: string; asignatura_id?: string | null; titulo?: string; tipo?: TipoTarea; fecha?: string; hora?: string | null; hecha?: boolean; created_at?: string };
        Relationships: [];
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { id?: string; user_id?: string; endpoint: string; p256dh: string; auth: string; created_at?: string };
        Update: { id?: string; user_id?: string; endpoint?: string; p256dh?: string; auth?: string; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: { tipo_tarea: TipoTarea };
    CompositeTypes: Record<string, never>;
  };
};
