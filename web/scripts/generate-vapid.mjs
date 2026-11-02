// Genera un par de claves VAPID sin instalar ningún paquete (solo Node).
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const jwk = privateKey.export({ format: "jwk" });
const bytes = (s) => Buffer.from(s, "base64url");
const publica = Buffer.concat([Buffer.from([4]), bytes(jwk.x), bytes(jwk.y)]).toString("base64url");

console.log("VITE_VAPID_PUBLIC_KEY=" + publica + "   (va en web/.env y en Vercel)");
console.log("VAPID_PUBLIC_KEY=" + publica + "   (secreto de la Edge Function)");
console.log("VAPID_PRIVATE_KEY=" + jwk.d + "   (secreto de la Edge Function; no lo compartas)");
