import { useMemo, useState, type CSSProperties } from "react";
import { agruparPorDia } from "../../../domain/agenda";
import { type Asignatura, type ISODate, type Tarea } from "../../../domain/entities";
import { addDays, fromISO, todayISO } from "../../../domain/dates";
import { TareaPill } from "../TareaPill/TareaPill";
import "./WeekView.css";

interface Props {
  inicio: ISODate; // lunes
  tareas: readonly Tarea[];
  asignaturas: ReadonlyMap<string, Asignatura>;
  onSelectDay: (d: ISODate) => void;
  onToggle: (t: Tarea) => void;
  onDropSubject: (d: ISODate, asignaturaId: string) => void;
  dias?: number;
}

export function WeekView({ inicio, tareas, asignaturas, onSelectDay, onToggle, onDropSubject, dias = 7 }: Props) {
  const porDia = useMemo(() => agruparPorDia(tareas), [tareas]);
  const hoy = todayISO();
  const [sobre, setSobre] = useState<ISODate | null>(null);
  const horas = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
  const posicion = (hora: string | null, index: number): CSSProperties => {
    if (!hora) return { gridRow: `${2 + index * 2} / span 2` };
    const [h, m] = hora.slice(0, 5).split(":").map(Number);
    // El lienzo abarca de 08:00 a 18:00, con una fila cada media hora.
    const fila = Math.max(1, Math.min(20, (h - 8) * 2 + (m >= 30 ? 2 : 1)));
    return { gridRow: `${fila} / span 2` };
  };

  return (
    <div className={`week-calendar${dias === 1 ? " day-calendar" : ""}`}>
      <div className="time-axis" aria-hidden="true"><div className="time-axis-head" />{horas.map((hora) => <span key={hora}>{hora}</span>)}</div>
      <div className="week">
      {Array.from({ length: dias }, (_, i) => addDays(inicio, i)).map((d) => {
        const f = fromISO(d);
        return (
          <div key={d} className="wcol">
            <div className="whead">
              <span className="cap">{f.toLocaleDateString("es-ES", { weekday: "short" })}</span>
              <b className={d === hoy ? "today" : ""}>{f.getDate()}</b>
            </div>
            <div className={`wbody${sobre === d ? " drag-over" : ""}`} role="button" tabIndex={0} aria-label={`Abrir ${d}`} onClick={() => onSelectDay(d)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onSelectDay(d); }} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => { e.preventDefault(); setSobre(d); }} onDragLeave={() => setSobre((actual) => actual === d ? null : actual)} onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData("application/x-agenda-subject"); if (id) onDropSubject(d, id); }}>
              {(porDia.get(d) ?? []).map((t, index) => {
                const a = t.asignaturaId ? asignaturas.get(t.asignaturaId) : undefined;
                const detalle = t.hora?.slice(0, 5);
                return <div key={t.id} className="scheduled-task" style={posicion(t.hora, index)}><TareaPill tarea={t} color={a?.color} detalle={detalle} onToggle={onToggle} compacto={dias !== 1} /></div>;
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
