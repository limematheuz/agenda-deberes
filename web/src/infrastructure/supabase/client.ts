import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el archivo .env");

export const supabase = createClient<Database>(url, key);

export function assertOk(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}
