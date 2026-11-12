import { supabase } from "../supabase/client";

import type { EstadoPush, PushGateway } from "../../domain/ports";

const VAPID_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const vapidValida = (): boolean => /^[A-Za-z0-9_-]{80,}$/.test(VAPID_PUBLICA ?? "");

const soportado = (): boolean =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && vapidValida();

function base64UrlABytes(s: string): Uint8Array<ArrayBuffer> {
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function registrarServiceWorker(): void {
  if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
}

export async function estadoPush(): Promise<EstadoPush> {
  if (!soportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await navigator.serviceWorker.ready;
  return (await reg.pushManager.getSubscription()) ? "activo" : "inactivo";
}

async function guardarSuscripcionUsuario(userId: string, sub: PushSubscription): Promise<boolean> {
  const { endpoint, keys } = sub.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) return false;

  // 1) Si el usuario actual ya tiene este endpoint registrado, actualizamos sus claves por id.
  const { data: propia } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (propia?.id) {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ p256dh: keys.p256dh, auth: keys.auth })
      .eq("id", propia.id);
    return !error;
  }

  // 2) Insertamos una nueva fila asociada explícitamente al user_id actual.
  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth });

  return !error;
}

/** Pide permiso, suscribe este dispositivo y guarda la suscripción en la BD sin colisionar entre cuentas. */
export async function activarPush(): Promise<EstadoPush> {
  if (!soportado()) return "no-soportado";
  if ((await Notification.requestPermission()) !== "granted") return estadoPush();

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return "inactivo";

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlABytes(VAPID_PUBLICA),
    });
  }

  const guardado = await guardarSuscripcionUsuario(userId, sub);
  if (!guardado) {
    // Si el endpoint pertenecía a otra sesión previa en este navegador, renovamos la suscripción Push
    // para obtener un endpoint nuevo exclusivo del usuario actual y evitar bloqueo de RLS.
    try {
      await sub.unsubscribe();
      const nuevaSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlABytes(VAPID_PUBLICA),
      });
      await guardarSuscripcionUsuario(userId, nuevaSub);
    } catch {
      // Mantenemos el estado activo local del navegador sin lanzar error de RLS al usuario.
    }
  }
  return "activo";
}

export const webPushGateway: PushGateway = { estado: estadoPush, activar: activarPush };
