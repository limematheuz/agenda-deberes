import type { ISODate, Tarea } from "../../../domain/entities";
import { describeDays, isUrgent, rank, urgencyOf, type Urgency } from "../../../domain/urgency";
import type { EstadoPush } from "../../../domain/ports";
import "./UrgencyBanner.css";

interface Props {
  tareas: readonly Tarea[];
  estado: EstadoPush;
  onSelect: (fecha: ISODate) => void;
}

const AYUDA: Partial<Record<EstadoPush, string>> = {
  bloqueado: "Los avisos están bloqueados. Actívalos en los ajustes del sitio de tu navegador.",
  "no-soportado": "Instala la app (Añadir a pantalla de inicio o al Dock) para recibir avisos en este dispositivo.",
};

export function UrgencyBanner({ tareas, estado, onSelect }: Props) {
  const urgentes = tareas
    .filter(isUrgent)
    .sort((a, b) => rank(urgencyOf(b)) - rank(urgencyOf(a)) || a.fecha.localeCompare(b.fecha));
  if (!urgentes.length && (estado === "activo" || estado === "inactivo")) return null;
  const nivel: Urgency = urgentes.length ? urgencyOf(urgentes[0]) : "ninguna";

  return (
    <section className={`banner u-${nivel}`} aria-live="polite">
      {urgentes.length > 0 && (
        <>
          <strong>{urgentes.length === 1 ? "1 entrega urgente" : `${urgentes.length} entregas urgentes`}</strong>
          <ul>
            {urgentes.slice(0, 4).map((t) => (
              <li key={t.id}>
                <button className="ghost" onClick={() => onSelect(t.fecha)}>{t.titulo}</button>
                <span>{describeDays(t.fecha)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {AYUDA[estado] && <span className="muted">{AYUDA[estado]}</span>}
    </section>
  );
}
