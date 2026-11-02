// Edge Function (TypeScript, Deno). La invoca pg_cron dos veces al día.
// Capas: domain (reglas puras) · application (caso de uso) · infrastructure (Supabase, web-push) · index (HTTP + composición).
import { createClient } from "jsr:@supabase/supabase-js@2.118.0";
import { enviarAvisos } from "./application/enviar-avisos.ts";
import { env } from "./infrastructure/env.ts";
import { SupabaseAvisosStore } from "./infrastructure/supabase-avisos-store.ts";
import { WebPushSender } from "./infrastructure/web-push-sender.ts";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function igualesSeguro(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let r = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) r |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return r === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (!igualesSeguro(req.headers.get("x-cron-secret") ?? "", env("CRON_SECRET"))) return json({ error: "No autorizado" }, 401);
  try {
    const store = new SupabaseAvisosStore(createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")));
    const sender = new WebPushSender(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
    return json(await enviarAvisos({ store, sender, ahora: new Date() }));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
