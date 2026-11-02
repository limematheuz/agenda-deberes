const ZONA = "Europe/Madrid";

/** Fecha de hoy en Madrid, formato YYYY-MM-DD. */
export const fechaMadrid = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(d);
export const horaMadrid = (d: Date): number =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "numeric", hourCycle: "h23" }).format(d));
export const diasHasta = (desde: string, hasta: string): number => Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
export const sumarDias = (fecha: string, n: number): string => new Date(Date.parse(fecha) + n * 86_400_000).toISOString().slice(0, 10);
