import type { ISODate } from "./entities";

const pad = (n: number): string => String(n).padStart(2, "0");
export const toISO = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromISO = (s: ISODate): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = (): ISODate => toISO(new Date());
export const daysUntil = (s: ISODate): number =>
  Math.round((fromISO(s).getTime() - fromISO(todayISO()).getTime()) / 86_400_000);
export const formatLong = (s: ISODate): string =>
  fromISO(s).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

/** Casillas del mes, empezando en lunes; null = hueco. */
export function monthGrid(year: number, month: number): Array<ISODate | null> {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  return [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => toISO(new Date(year, month, i + 1))),
  ];
}

/** Rejilla completa de 35 o 42 casillas (incluye días previos y siguientes) al estilo Shadcn Calendar. */
export function monthCalendarCells(year: number, month: number): Array<{ iso: ISODate; inMonth: boolean }> {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  const prevTotal = new Date(year, month, 0).getDate();
  const cells: Array<{ iso: ISODate; inMonth: boolean }> = [];
  for (let i = lead - 1; i >= 0; i--) {
    cells.push({ iso: toISO(new Date(year, month - 1, prevTotal - i)), inMonth: false });
  }
  for (let i = 1; i <= total; i++) {
    cells.push({ iso: toISO(new Date(year, month, i)), inMonth: true });
  }
  const totalCells = cells.length <= 35 ? 35 : 42;
  let nextDay = 1;
  while (cells.length < totalCells) {
    cells.push({ iso: toISO(new Date(year, month + 1, nextDay++)), inMonth: false });
  }
  return cells;
}

export const addDays = (s: ISODate, n: number): ISODate => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
/** Lunes de la semana que contiene la fecha. */
export const lunesDe = (s: ISODate): ISODate => addDays(s, -((fromISO(s).getDay() + 6) % 7));
