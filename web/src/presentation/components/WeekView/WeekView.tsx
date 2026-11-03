import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from "react";
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
  onMoveTask: (id: string, fecha: ISODate, hora: string | null) => void;
  dias?: number;
}

export function WeekView({ inicio, tareas, asignaturas, onSelectDay, onToggle, onDropSubject, onMoveTask, dias = 7 }: Props) {
  const porDia = useMemo(() => agruparPorDia(tareas), [tareas]);
  const hoy = todayISO();
  const [sobre, setSobre] = useState<ISODate | null>(null);
  const diasCalendario = Array.from({ length: dias }, (_, i) => addDays(inicio, i));
  const [diaMovil, setDiaMovil] = useState<ISODate>(() => diasCalendario.includes(hoy) ? hoy : inicio);
  useEffect(() => { if (!diasCalendario.includes(diaMovil)) setDiaMovil(diasCalendario.includes(hoy) ? hoy : inicio); }, [diaMovil, diasCalendario, hoy, inicio]);
  const horas = Array.from({ length: 10 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);
  const posicion = (hora: string | null, index: number): CSSProperties => {
    if (!hora) return { gridRow: `${2 + index * 2} / span 2` };
    const [h, m] = hora.slice(0, 5).split(":").map(Number);
    // El lienzo abarca de 08:00 a 18:00, con una fila cada media hora.
    const fila = Math.max(1, Math.min(20, (h - 8) * 2 + (m >= 30 ? 2 : 1)));
    return { gridRow: `${fila} / span 2` };
  };
  const horaEnPunto = (evento: DragEvent<HTMLDivElement>): string => {
    const cuerpo = evento.currentTarget.getBoundingClientRect();
    const fila = Math.max(0, Math.min(19, Math.floor((evento.clientY - cuerpo.top) / 27)));
    const hora = 8 + Math.floor(fila / 2);
    return `${String(hora).padStart(2, "0")}:${fila % 2 ? "30" : "00"}`;
  };

  return (
    <div className={`week-calendar${dias === 1 ? " day-calendar" : ""}`}>
      {dias > 1 && <div className="mobile-week-days" aria-label="Días de la semana">{diasCalendario.map((d) => { const f = fromISO(d); return <button key={d} className={d === diaMovil ? "on" : ""} onClick={() => setDiaMovil(d)}><span>{f.toLocaleDateString("es-ES", { weekday: "short" })}</span><b className={d === hoy ? "today" : ""}>{f.getDate()}</b></button>; })}</div>}
      <div className="time-axis" aria-hidden="true"><div className="time-axis-head" />{horas.map((hora) => <span key={hora}>{hora}</span>)}</div>
      <div className="week">
      {diasCalendario.map((d) => {
        const f = fromISO(d);
        return (
          <div key={d} className={`wcol${d === diaMovil ? " mobile-active" : ""}`}>
            <div className="whead">
              <span className="cap">{f.toLocaleDateString("es-ES", { weekday: "short" })}</span>
              <b className={d === hoy ? "today" : ""}>{f.getDate()}</b>
            </div>
            <div className={`wbody${sobre === d ? " drag-over" : ""}`} role="button" tabIndex={0} aria-label={`Abrir ${d}`} onClick={() => onSelectDay(d)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onSelectDay(d); }} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => { e.preventDefault(); setSobre(d); }} onDragLeave={() => setSobre((actual) => actual === d ? null : actual)} onDrop={(e) => { e.preventDefault(); setSobre(null); const asignaturaId = e.dataTransfer.getData("application/x-agenda-subject"); const tareaId = e.dataTransfer.getData("application/x-agenda-task"); if (asignaturaId) onDropSubject(d, asignaturaId); if (tareaId) onMoveTask(tareaId, d, horaEnPunto(e)); }}>
              {(porDia.get(d) ?? []).map((t, index) => {
                const a = t.asignaturaId ? asignaturas.get(t.asignaturaId) : undefined;
                const detalle = t.hora?.slice(0, 5);
                return <div key={t.id} className="scheduled-task" style={posicion(t.hora, index)} draggable onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.setData("application/x-agenda-task", t.id); e.dataTransfer.effectAllowed = "move"; }} onClick={(e) => { e.stopPropagation(); onSelectDay(d); }}><TareaPill tarea={t} color={a?.color} detalle={detalle} onToggle={onToggle} compacto={dias !== 1} /></div>;
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
