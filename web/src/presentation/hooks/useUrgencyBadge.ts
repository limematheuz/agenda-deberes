import { useEffect } from "react";
import type { Tarea } from "../../domain/entities";
import { isUrgent } from "../../domain/urgency";

const TITULO = "Agenda de deberes";
type NavegadorConBadge = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/** Número de entregas urgentes en el título de la pestaña y en el icono de la app instalada. */
export function useUrgencyBadge(tareas: readonly Tarea[]): void {
  useEffect(() => {
    const n = tareas.filter(isUrgent).length;
    document.title = n ? `(${n}) ${TITULO}` : TITULO;
    const nav = navigator as NavegadorConBadge;
    (n ? nav.setAppBadge?.(n) : nav.clearAppBadge?.())?.catch(() => undefined);
  }, [tareas]);
}
