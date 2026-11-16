// Edge Function (TypeScript, Deno).
// Se invoca de dos formas:
// 1) Con x-cron-secret desde pg_cron (avisos diarios por cambio de fecha).
// 2) Con Authorization: Bearer <JWT> desde la app en el momento en que una tarea genera aviso inmediato.
import { createClient } from "jsr:@supabase/supabase-js@2.118.0";
import { enviarAvisos } from "./application/enviar-avisos.ts";
import { env } from "./infrastructure/env.ts";
import { SupabaseAvisosStore } from "./infrastructure/supabase-avisos-store.ts";
import { WebPushSender } from "./infrastructure/web-push-sender.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

function igualesSeguro(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let r = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) r |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return r === 0;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS_HEADERS });

  const url = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, serviceRoleKey);

  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const esCron = Boolean(cronHeader) && igualesSeguro(cronHeader, env("CRON_SECRET"));

  let userId: string | undefined;
  if (!esCron) {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado" }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user?.id) return json({ error: "No autorizado" }, 401);
    userId = data.user.id;
  }

  try {
    const store = new SupabaseAvisosStore(admin);
    const sender = new WebPushSender(env("VAPID_SUBJECT"), env("VAPID_PUBLIC_KEY"), env("VAPID_PRIVATE_KEY"));
    return json(await enviarAvisos({ store, sender, ahora: new Date(), userId }));
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Error desconocido" }, 500);
  }
});
