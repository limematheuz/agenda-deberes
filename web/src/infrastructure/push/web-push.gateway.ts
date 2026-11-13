import { supabase } from "../supabase/client";
import type { EstadoPush, PushGateway } from "../../domain/ports";
import { mostrarNotificacionDispositivo } from "./local-notifier";

const VAPID_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const vapidValida = (): boolean => /^[A-Za-z0-9_-]{80,}$/.test(VAPID_PUBLICA ?? "");

const soportadoLocal = (): boolean => "Notification" in window;
const soportadoPushRemoto = (): boolean =>
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
  if (!soportadoLocal()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission === "granted") {
    if (soportadoPushRemoto()) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) return "activo";
      } catch {
        // Sin red o sin pushManager activo; sigue habiendo permiso local
      }
    }
    return "activo";
  }
  return "inactivo";
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

/** Pide permiso, muestra confirmación nativa en el dispositivo y registra Web Push en la BD. */
export async function activarPush(): Promise<EstadoPush> {
  if (!soportadoLocal()) return "no-soportado";
  const yaTeniaPermiso = Notification.permission === "granted";
  const permiso = yaTeniaPermiso ? "granted" : await Notification.requestPermission();
  if (permiso !== "granted") return estadoPush();

  // Confirmación inmediata en el centro de notificaciones del dispositivo (Mac / Android) la primera vez
  if (!yaTeniaPermiso) {
    void mostrarNotificacionDispositivo(
      "CalendarAppio · Avisos activados",
      "Recibirás alertas en este dispositivo para tus tareas y recordatorios.",
      "calendarappio-welcome",
    );
  }

  if (soportadoPushRemoto() && (typeof navigator === "undefined" || navigator.onLine)) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
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
          try {
            await sub.unsubscribe();
            const nuevaSub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: base64UrlABytes(VAPID_PUBLICA),
            });
            await guardarSuscripcionUsuario(userId, nuevaSub);
          } catch {
            // Mantenemos el estado activo local del navegador
          }
        }
      }
    } catch {
      // Si falla la suscripción remota (ej. offline), el permiso local ya queda activo
    }
  }

  return "activo";
}

export const webPushGateway: PushGateway = { estado: estadoPush, activar: activarPush };
