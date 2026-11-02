// Raíz de composición: único lugar que conoce las implementaciones concretas.
import type { Services } from "../domain/ports";
import { webPushGateway } from "../infrastructure/push/web-push.gateway";
import { supabaseAsignaturasRepository } from "../infrastructure/supabase/asignaturas.repository";
import { supabaseAuthGateway } from "../infrastructure/supabase/auth.gateway";
import { supabaseTareasRepository } from "../infrastructure/supabase/tareas.repository";

export const services: Services = {
  tareas: supabaseTareasRepository,
  asignaturas: supabaseAsignaturasRepository,
  auth: supabaseAuthGateway,
  push: webPushGateway,
};
