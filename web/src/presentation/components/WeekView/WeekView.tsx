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
  onDropScheduleClass?: (d: ISODate, claseId: string, hora: string | null) => void;
  onMoveTask: (id: string, fecha: ISODate, hora: string | null) => void;
  dias?: number;
}

interface BloqueDia {
  key: string;
  startMin: number;
  endMin: number;
  tarea: Tarea;
}

interface BloquePosicion extends BloqueDia {
  col: number;
  totalCols: number;
}

const HORA_INICIO = 6;
const HORA_FIN = 24;
const ALTO_MEDIA_HORA = 30; // 60px por hora (1px = 1 min)
const ALTO_HORA = ALTO_MEDIA_HORA * 2;

function parseMinutos(hm: string | null | undefined, fallbackHora: number): number {
  if (!hm) return fallbackHora * 60;
  const [h, m] = hm.slice(0, 5).split(":").map(Number);
  if (Number.isNaN(h)) return fallbackHora * 60;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Asigna columnas paralelas solo cuando dos tareas se solapan en la misma franja horaria. */
function distribuirBloquesDia(bloques: BloqueDia[]): BloquePosicion[] {
  const ordenados = [...bloques].sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin));
  const resultado: BloquePosicion[] = [];
  let grupo: BloqueDia[] = [];
  let maxFinGrupo = -1;

  const procesarGrupo = (items: BloqueDia[]) => {
    if (items.length === 0) return;
    const finColumnas: number[] = [];
    const asignados: Array<{ item: BloqueDia; col: number }> = [];
    for (const item of items) {
      let col = finColumnas.findIndex((fin) => fin <= item.startMin);
      if (col === -1) {
        col = finColumnas.length;
        finColumnas.push(item.endMin);
      } else {
        finColumnas[col] = item.endMin;
      }
      asignados.push({ item, col });
    }
    const totalCols = Math.max(1, finColumnas.length);
    for (const { item, col } of asignados) {
      resultado.push({ ...item, col, totalCols });
    }
  };

  for (const b of ordenados) {
    if (grupo.length > 0 && b.startMin >= maxFinGrupo) {
      procesarGrupo(grupo);
      grupo = [];
      maxFinGrupo = -1;
    }
    grupo.push(b);
    maxFinGrupo = Math.max(maxFinGrupo, b.endMin);
  }
  procesarGrupo(grupo);
  return resultado;
}

export function WeekView({ inicio, tareas, asignaturas, onSelectDay, onToggle, onDropSubject, onDropScheduleClass, onMoveTask, dias = 7 }: Props) {
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
    const posicionActual = ((minutos - HORA_INICIO * 60) / 60) * ALTO_HORA;
    scrollRef.current.scrollTop = Math.max(0, posicionActual - 160);
  }, [inicio, dias, hoy]);

  const estiloBloque = (b: BloquePosicion): CSSProperties => {
    const minClampedStart = Math.max(HORA_INICIO * 60, Math.min((HORA_FIN - 0.5) * 60, b.startMin));
    const duracionMin = Math.max(30, b.endMin - b.startMin);
    const topPx = ((minClampedStart - HORA_INICIO * 60) / 60) * ALTO_HORA + 2;
    const heightPx = (duracionMin / 60) * ALTO_HORA - 4;
    const widthPct = 100 / b.totalCols;
    const leftPct = b.col * widthPct;
    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
      left: `calc(${leftPct}% + 3px)`,
      width: `calc(${widthPct}% - 6px)`,
    };
  };

  const horaEnPunto = (evento: DragEvent<HTMLDivElement>): string => {
    const cuerpo = evento.currentTarget.getBoundingClientRect();
    const fila = Math.max(0, Math.min((HORA_FIN - HORA_INICIO) * 2 - 1, Math.floor((evento.clientY - cuerpo.top) / ALTO_MEDIA_HORA)));
    const hora = HORA_INICIO + Math.floor(fila / 2);
    return `${String(hora).padStart(2, "0")}:${fila % 2 ? "30" : "00"}`;
  };

  return (
    <div className={`week-calendar${dias === 1 ? " day-calendar" : ""}`}>
      {dias > 1 && (
        <div className="mobile-week-days" aria-label="Días de la semana">
          {diasCalendario.map((d) => {
            const f = fromISO(d);
            return (
              <button key={d} className={d === diaMovil ? "on" : ""} onClick={() => setDiaMovil(d)}>
                <span>{f.toLocaleDateString("es-ES", { weekday: "short" })}</span>
                <b className={d === hoy ? "today" : ""}>{f.getDate()}</b>
              </button>
            );
          })}
        </div>
      )}
      <div className="week-scroll" ref={scrollRef}>
        <div className="time-axis" aria-hidden="true">
          <div className="time-axis-head" />
          {horas.map((hora) => (
            <div key={hora} className="time-axis-slot">
              <span>{hora}</span>
            </div>
          ))}
        </div>
        <div className="week">
          {diasCalendario.map((d) => {
            const f = fromISO(d);
            const tareasDia = porDia.get(d) ?? [];
            const bloquesRaw: BloqueDia[] = tareasDia.map((t, idx) => {
              const startMin = t.hora ? parseMinutos(t.hora, 9) : (8 + idx) * 60;
              return { key: `tarea-${t.id}`, startMin, endMin: startMin + 30, tarea: t };
            });
            const bloques = distribuirBloquesDia(bloquesRaw);

            return (
              <div key={d} className={`wcol${d === diaMovil ? " mobile-active" : ""}`}>
                <div className="whead">
                  <span className="cap">{f.toLocaleDateString("es-ES", { weekday: "short" })}</span>
                  <b className={d === hoy ? "today" : ""}>{f.getDate()}</b>
                </div>
                <div
                  className={`wbody${sobre === d ? " drag-over" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ${d}`}
                  onClick={() => onSelectDay(d)}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onSelectDay(d); }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={(e) => { e.preventDefault(); setSobre(d); }}
                  onDragLeave={() => setSobre((actual) => actual === d ? null : actual)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setSobre(null);
                    const asignaturaId = e.dataTransfer.getData("application/x-agenda-subject");
                    const tareaId = e.dataTransfer.getData("application/x-agenda-task");
                    const claseId = e.dataTransfer.getData("application/x-schedule-class");
                    if (asignaturaId) onDropSubject(d, asignaturaId, horaEnPunto(e));
                    if (claseId && onDropScheduleClass) onDropScheduleClass(d, claseId, horaEnPunto(e));
                    if (tareaId) onMoveTask(tareaId, d, horaEnPunto(e));
                  }}
                >
                  {horas.map((hora) => (
                    <div key={hora} className="wbody-hour-cell" aria-hidden="true" />
                  ))}
                  {(d === hoy || dias === 1) && ahora.getHours() >= HORA_INICIO && ahora.getHours() < HORA_FIN && (
                    <span className="now-line" style={{ top: `${((ahora.getHours() * 60 + ahora.getMinutes() - HORA_INICIO * 60) / 60) * ALTO_HORA}px` }}>
                      <i />
                    </span>
                  )}
                  {bloques.map((b) => {
                    const t = b.tarea;
                    const a = t.asignaturaId ? asignaturas.get(t.asignaturaId) : undefined;
                    const detalle = t.hora?.slice(0, 5);
                    return (
                      <div
                        key={b.key}
                        className="scheduled-task"
                        style={estiloBloque(b)}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("application/x-agenda-task", t.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => { e.stopPropagation(); onSelectDay(d); }}
                      >
                        <TareaPill tarea={t} color={a?.color} detalle={detalle} onToggle={onToggle} compacto={dias !== 1} />
                      </div>
                    );
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
