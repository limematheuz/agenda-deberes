import { useState } from "react";
import type { Vista } from "../../domain/agenda";
import { addDays, fromISO, lunesDe, toISO, todayISO } from "../../domain/dates";
import type { ISODate } from "../../domain/entities";

/** Vista activa (mes/semana), fecha ancla y navegación entre periodos. */
export function useCalendarView() {
  const [vista, setVista] = useState<Vista>("mes");
  const [ancla, setAncla] = useState<ISODate>(todayISO());
  const a = fromISO(ancla);
  const inicio = vista === "mes" ? toISO(new Date(a.getFullYear(), a.getMonth(), 1)) : vista === "dia" ? ancla : lunesDe(ancla);
  const fin = vista === "mes" ? toISO(new Date(a.getFullYear(), a.getMonth() + 1, 0)) : vista === "dia" ? ancla : addDays(inicio, 6);
  return {
    vista, setVista, setAncla, inicio, fin,
    year: a.getFullYear(),
    month: a.getMonth(),
    titulo: vista === "dia" ? a.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : a.toLocaleDateString("es-ES", { month: "long", year: "numeric" }).replace(" de ", " "),
    mover: (d: number): void => setAncla(vista === "mes" ? toISO(new Date(a.getFullYear(), a.getMonth() + d, 1)) : addDays(ancla, vista === "semana" ? 7 * d : d)),
    irAHoy: (): void => setAncla(todayISO()),
  };
}
