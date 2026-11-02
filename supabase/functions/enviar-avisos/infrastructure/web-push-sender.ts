import webpush from "npm:web-push@3.6.7";
import type { PushSender, ResultadoEnvio } from "../application/enviar-avisos.ts";
import type { Mensaje, Suscripcion } from "../domain/types.ts";

/** Adaptador del puerto PushSender sobre la librería web-push (VAPID). */
export class WebPushSender implements PushSender {
  constructor(asunto: string, clavePublica: string, clavePrivada: string) {
    webpush.setVapidDetails(asunto, clavePublica, clavePrivada);
  }
  async enviar(s: Suscripcion, m: Mensaje): Promise<ResultadoEnvio> {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(m));
      return "ok";
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) return "caducada"; // suscripción caducada
      console.error("Fallo al enviar el aviso", code ?? e);
      return "error";
    }
  }
}
