import { assertOk, supabase } from "../supabase/client";

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

/** Pide permiso, suscribe este dispositivo y guarda la suscripción en la BD (idempotente). */
export async function activarPush(): Promise<EstadoPush> {
  if (!soportado()) return "no-soportado";
  if ((await Notification.requestPermission()) !== "granted") return estadoPush();
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlABytes(VAPID_PUBLICA) }));
  const { endpoint, keys } = sub.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error("La suscripción push está incompleta");
  assertOk((await supabase.from("push_subscriptions").upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" })).error);
  return "activo";
}

export const webPushGateway: PushGateway = { estado: estadoPush, activar: activarPush };
