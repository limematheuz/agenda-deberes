import { todayISO } from "../../domain/dates";
import type { Recordatorio, Tarea } from "../../domain/entities";
import { describeDays, urgencyOf } from "../../domain/urgency";

const NOTIFIED_PREFIX = "agenda-notified-keys-";

function leerNotificadosHoy(hoy: string): Set<string> {
  try {
    const raw = localStorage.getItem(`${NOTIFIED_PREFIX}${hoy}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function guardarNotificadosHoy(hoy: string, set: Set<string>): void {
  try {
    localStorage.setItem(`${NOTIFIED_PREFIX}${hoy}`, JSON.stringify([...set]));
    // Limpiar claves de días anteriores
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(NOTIFIED_PREFIX) && k !== `${NOTIFIED_PREFIX}${hoy}`) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

/**
 * Muestra una notificación nativa en el sistema operativo (macOS, Android, iOS PWA, Windows).
 * Usa el Service Worker cuando está disponible (obligatorio en Android Chrome PWA) y `new Notification` como fallback.
 */
export async function mostrarNotificacionDispositivo(
  titulo: string,
  cuerpo: string,
  tag = "calendarappio-aviso",
): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  const opciones: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body: cuerpo,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    renotify: true,
    vibrate: [180, 80, 180],
    data: { url: "/" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1200)),
      ]);
      if (reg && "showNotification" in reg) {
        await reg.showNotification(titulo, opciones);
        return true;
      }
    }
  } catch {
    // Fallback a Notification API directa
  }

  try {
    new Notification(titulo, { body: cuerpo, icon: "/icon-192.png", tag });
    return true;
  } catch {
    return false;
  }
}

function minutosAhora(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function parseHoraMinutos(hora: string | null): number | null {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Evalúa tareas prioritarias y recordatorios activos para hoy, enviando alertas nativas
 * al dispositivo por cada aviso que aún no haya sido notificado hoy.
 */
export async function evaluarYNotificarPendientes(
  tareas: readonly Tarea[],
  recordatorios: readonly Recordatorio[],
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const hoy = todayISO();
  const notificados = leerNotificadosHoy(hoy);
  let huboCambios = false;
  const ahoraMin = minutosAhora();

  // 1. Recordatorios activos para hoy o atrasados
  const recsActivos = recordatorios.filter((r) => !r.hecho && r.fechaAviso !== null && r.fechaAviso <= hoy);
  for (const r of recsActivos) {
    const key = `rec:${r.id}`;
    if (!notificados.has(key)) {
      notificados.add(key);
      huboCambios = true;
      const detalle = r.fechaAviso ? describeDays(r.fechaAviso) : "Para hoy";
      await mostrarNotificacionDispositivo(`🔔 ${r.titulo}`, `Recordatorio · ${detalle}`, `rec-${r.id}`);
    }
  }

  // 2. Tareas urgentes de hoy / vencidas
  const urgentes = tareas.filter((t) => !t.hecha && urgencyOf(t) === "alta");
  for (const t of urgentes) {
    // Aviso general del día (máximo 1 vez al día por tarea urgente)
    const keyDia = `tarea-dia:${t.id}`;
    if (!notificados.has(keyDia)) {
      notificados.add(keyDia);
      huboCambios = true;
      const horaTxt = t.hora ? ` a las ${t.hora.slice(0, 5)}` : "";
      await mostrarNotificacionDispositivo(
        `📌 ${t.titulo}`,
        `${describeDays(t.fecha)}${horaTxt}`,
        `tarea-${t.id}`,
      );
    }

    // Aviso puntual si la tarea es hoy y tiene hora exacta (avisa 15 min antes y a la hora exacta)
    if (t.fecha === hoy && t.hora) {
      const mins = parseHoraMinutos(t.hora);
      if (mins !== null) {
        const diff = mins - ahoraMin;
        if (diff >= 10 && diff <= 15) {
          const keyPrevio = `tarea-15m:${t.id}`;
          if (!notificados.has(keyPrevio)) {
            notificados.add(keyPrevio);
            huboCambios = true;
            await mostrarNotificacionDispositivo(
              `⏰ En ${diff} min: ${t.titulo}`,
              `Programado a las ${t.hora.slice(0, 5)}`,
              `tarea-prev-${t.id}`,
            );
          }
        } else if (diff >= -2 && diff <= 1) {
          const keyHora = `tarea-hora:${t.id}`;
          if (!notificados.has(keyHora)) {
            notificados.add(keyHora);
            huboCambios = true;
            await mostrarNotificacionDispositivo(
              `🔔 Ahora (${t.hora.slice(0, 5)}): ${t.titulo}`,
              `Es la hora de esta tarea`,
              `tarea-hora-${t.id}`,
            );
          }
        }
      }
    }
  }

  if (huboCambios) {
    guardarNotificadosHoy(hoy, notificados);
  }
}
