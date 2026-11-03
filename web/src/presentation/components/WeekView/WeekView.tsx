import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
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
  onDropSubject: (d: ISODate, asignaturaId: string, hora: string | null) => void;
  onMoveTask: (id: string, fecha: ISODate, hora: string | null) => void;
  dias?: number;
}

export function WeekView({ inicio, tareas, asignaturas, onSelectDay, onToggle, onDropSubject, onMoveTask, dias = 7 }: Props) {
  const HORA_INICIO = 6;
  const HORA_FIN = 24;
  const ALTO_MEDIA_HORA = 27;
  const porDia = useMemo(() => agruparPorDia(tareas), [tareas]);
  const hoy = todayISO();
  const [ahora, setAhora] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sobre, setSobre] = useState<ISODate | null>(null);
  const diasCalendario = Array.from({ length: dias }, (_, i) => addDays(inicio, i));
  const [diaMovil, setDiaMovil] = useState<ISODate>(() => diasCalendario.includes(hoy) ? hoy : inicio);
  useEffect(() => { if (!diasCalendario.includes(diaMovil)) setDiaMovil(diasCalendario.includes(hoy) ? hoy : inicio); }, [diaMovil, diasCalendario, hoy, inicio]);
  const horas = Array.from({ length: HORA_FIN - HORA_INICIO }, (_, i) => `${String(i + HORA_INICIO).padStart(2, "0")}:00`);
  useEffect(() => {
    const timer = window.setInterval(() => setAhora(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!diasCalendario.includes(hoy) || !scrollRef.current) return;
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const posicionActual = ((minutos - HORA_INICIO * 60) / 30) * ALTO_MEDIA_HORA;
    scrollRef.current.scrollTop = Math.max(0, posicionActual - 150);
  }, [inicio, dias, hoy]);
  const posicion = (hora: string | null, index: number): CSSProperties => {
    if (!hora) return { gridRow: `${2 + index * 2} / span 2` };
    const [h, m] = hora.slice(0, 5).split(":").map(Number);
    // El día comienza visualmente a las 06:00, pero el scroll se sitúa cerca de la hora actual.
    const fila = Math.max(1, Math.min((HORA_FIN - HORA_INICIO) * 2, (h - HORA_INICIO) * 2 + (m >= 30 ? 2 : 1)));
    return { gridRow: `${fila} / span 2` };
  };
  const horaEnPunto = (evento: DragEvent<HTMLDivElement>): string => {
    const cuerpo = evento.currentTarget.getBoundingClientRect();
    const fila = Math.max(0, Math.min((HORA_FIN - HORA_INICIO) * 2 - 1, Math.floor((evento.clientY - cuerpo.top) / ALTO_MEDIA_HORA)));
    const hora = HORA_INICIO + Math.floor(fila / 2);
    return `${String(hora).padStart(2, "0")}:${fila % 2 ? "30" : "00"}`;
  };

  return (
    <div className={`week-calendar${dias === 1 ? " day-calendar" : ""}`}>
      {dias > 1 && <div className="mobile-week-days" aria-label="Días de la semana">{diasCalendario.map((d) => { const f = fromISO(d); return <button key={d} className={d === diaMovil ? "on" : ""} onClick={() => setDiaMovil(d)}><span>{f.toLocaleDateString("es-ES", { weekday: "short" })}</span><b className={d === hoy ? "today" : ""}>{f.getDate()}</b></button>; })}</div>}
      <div className="week-scroll" ref={scrollRef}>
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
            <div className={`wbody${sobre === d ? " drag-over" : ""}`} role="button" tabIndex={0} aria-label={`Abrir ${d}`} onClick={() => onSelectDay(d)} onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onSelectDay(d); }} onDragOver={(e) => e.preventDefault()} onDragEnter={(e) => { e.preventDefault(); setSobre(d); }} onDragLeave={() => setSobre((actual) => actual === d ? null : actual)} onDrop={(e) => { e.preventDefault(); setSobre(null); const asignaturaId = e.dataTransfer.getData("application/x-agenda-subject"); const tareaId = e.dataTransfer.getData("application/x-agenda-task"); if (asignaturaId) onDropSubject(d, asignaturaId, horaEnPunto(e)); if (tareaId) onMoveTask(tareaId, d, horaEnPunto(e)); }}>
              {(d === hoy || dias === 1) && ahora.getHours() >= HORA_INICIO && ahora.getHours() < HORA_FIN && <span className="now-line" style={{ top: `${((ahora.getHours() * 60 + ahora.getMinutes() - HORA_INICIO * 60) / 30) * ALTO_MEDIA_HORA}px` }}><i /></span>}
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
    </div>
  );
}
