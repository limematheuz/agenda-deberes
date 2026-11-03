import type { ISODate, Tarea } from "../../../domain/entities";
import { describeDays, rank, urgencyOf, type Urgency } from "../../../domain/urgency";
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
  const ordenadas = [...tareas].filter((t) => !t.hecha).sort((a, b) => rank(urgencyOf(b)) - rank(urgencyOf(a)) || a.fecha.localeCompare(b.fecha));
  const gruposBase: ReadonlyArray<{ nivel: Urgency; titulo: (n: number) => string; tareas: readonly Tarea[] }> = [
    { nivel: "alta", titulo: (n: number) => n === 1 ? "1 entrega prioritaria" : `${n} entregas prioritarias`, tareas: ordenadas.filter((t) => rank(urgencyOf(t)) >= rank("alta")) },
    { nivel: "media", titulo: (n: number) => n === 1 ? "1 entrega esta semana" : `${n} entregas esta semana`, tareas: ordenadas.filter((t) => urgencyOf(t) === "media") },
    { nivel: "baja", titulo: (n: number) => n === 1 ? "1 tarea planificada" : `${n} tareas planificadas`, tareas: ordenadas.filter((t) => urgencyOf(t) === "baja") },
  ];
  const grupos = gruposBase.filter((grupo) => grupo.tareas.length > 0);
  if (!grupos.length && !AYUDA[estado]) return null;

  return (
    <div className="urgency-stack" aria-live="polite">
      {grupos.map((grupo) => <section key={grupo.nivel} className={`banner u-${grupo.nivel}`}><strong>{grupo.titulo(grupo.tareas.length)}</strong><ul>{grupo.tareas.slice(0, 3).map((t) => <li key={t.id}><button className="ghost" onClick={() => onSelect(t.fecha)}>{t.titulo}</button><span>{describeDays(t.fecha)}</span></li>)}</ul></section>)}
      {AYUDA[estado] && <section className="banner u-baja"><span>{AYUDA[estado]}</span></section>}
    </div>
  );
}
