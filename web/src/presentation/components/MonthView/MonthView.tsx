import { useMemo, useState } from "react";
import { agruparPorDia } from "../../../domain/agenda";
import type { Asignatura, ISODate, Tarea } from "../../../domain/entities";
import { monthCalendarCells, todayISO } from "../../../domain/dates";
import { TareaPill } from "../TareaPill/TareaPill";
import "./MonthView.css";

interface Props {
  year: number;
  month: number;
  tareas: readonly Tarea[];
  asignaturas: ReadonlyMap<string, Asignatura>;
  onSelectDay: (d: ISODate) => void;
  onToggle: (t: Tarea) => void;
  onDropSubject: (d: ISODate, asignaturaId: string) => void;
  onDropScheduleClass?: (d: ISODate, claseId: string) => void;
  onMoveTask: (id: string, fecha: ISODate) => void;
}

const SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_VISIBLE_PILLS = 3;

export function MonthView({ year, month, tareas, asignaturas, onSelectDay, onToggle, onDropSubject, onDropScheduleClass, onMoveTask }: Props) {
  const porDia = useMemo(() => agruparPorDia(tareas), [tareas]);
  const hoy = todayISO();
  const [sobre, setSobre] = useState<ISODate | null>(null);
  const color = (t: Tarea): string | undefined => (t.asignaturaId ? asignaturas.get(t.asignaturaId)?.color : undefined);
  const cells = useMemo(() => monthCalendarCells(year, month), [year, month]);

  return (
    <div className="month-calendar">
      <div className="wkh" aria-hidden="true">{SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mgrid">
        {cells.map(({ iso: d, inMonth }) => {
          const ts = porDia.get(d) ?? [];
          const visibles = ts.slice(0, MAX_VISIBLE_PILLS);
          const restantes = ts.length - visibles.length;
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              className={`cell${!inMonth ? " outside" : ""}${d === hoy ? " today" : ""}${sobre === d ? " drag-over" : ""}`}
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
                if (asignaturaId) onDropSubject(d, asignaturaId);
                if (claseId && onDropScheduleClass) onDropScheduleClass(d, claseId);
                if (tareaId) onMoveTask(tareaId, d);
              }}
            >
              <div className="cell-top">
                <span className="num">{Number(d.slice(8))}</span>
              </div>
              <div className="pills">
                {visibles.map((t) => (
                  <div
                    key={t.id}
                    className="month-task"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("application/x-agenda-task", t.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDay(d);
                    }}
                  >
                    <TareaPill tarea={t} color={color(t)} detalle={t.hora?.slice(0, 5)} onToggle={onToggle} compacto />
                  </div>
                ))}
                {restantes > 0 && (
                  <span className="more-events">+{restantes} más</span>
                )}
              </div>
              <div className="dots" aria-hidden="true">
                {ts.filter((t) => !t.hecha).slice(0, 4).map((t) => <i key={t.id} style={{ background: color(t) ?? "#667085" }} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
