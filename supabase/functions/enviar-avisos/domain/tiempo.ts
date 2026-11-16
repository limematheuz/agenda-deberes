const ZONA = "Europe/Madrid";

/** Fecha de hoy en Madrid, formato YYYY-MM-DD. */
export const fechaMadrid = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
export const horaMadrid = (d: Date): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" }).format(d));
export const minutosMadrid = (d: Date): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
};
export const parseHoraMinutos = (hora: string | null): number | null => {
  if (!hora) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(hora);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
export const diasHasta = (desde: string, hasta: string): number => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
export const sumarDias = (fecha: string, n: number): string => new Date(Date.parse(fecha) + n * 86_400_000).toISOString().slice(0, 10);
