import { useMemo, useState } from "react";
import { agruparPorDia } from "../../../domain/agenda";
import type { Asignatura, ISODate, Tarea } from "../../../domain/entities";
import { monthGrid, todayISO } from "../../../domain/dates";
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
}

const SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function MonthView({ year, month, tareas, asignaturas, onSelectDay, onToggle, onDropSubject }: Props) {
  const porDia = useMemo(() => agruparPorDia(tareas), [tareas]);
  const hoy = todayISO();
  const [sobre, setSobre] = useState<ISODate | null>(null);
  const color = (t: Tarea): string | undefined => (t.asignaturaId ? asignaturas.get(t.asignaturaId)?.color : undefined);

  return (
    <div>
      <div className="wkh" aria-hidden="true">{SEMANA.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="mgrid">
        {monthGrid(year, month).map((d, i) => {
          if (d === null) return <div key={`v${i}`} className="cell empty" />;
          const ts = porDia.get(d) ?? [];
          return (
            <div
              key={d}
              role="button"
              tabIndex={0}
              className={`cell${d === hoy ? " today" : ""}${sobre === d ? " drag-over" : ""}`}
              onClick={() => onSelectDay(d)}
              onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) onSelectDay(d); }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={(e) => { e.preventDefault(); setSobre(d); }}
              onDragLeave={() => setSobre((actual) => actual === d ? null : actual)}
              onDrop={(e) => { e.preventDefault(); setSobre(null); const id = e.dataTransfer.getData("application/x-agenda-subject"); if (id) onDropSubject(d, id); }}
            >
              <span className="num">{Number(d.slice(8))}</span>
              <div className="pills">
                {ts.slice(0, 3).map((t) => <TareaPill key={t.id} tarea={t} color={color(t)} detalle={t.hora?.slice(0, 5)} onToggle={onToggle} compacto />)}
              </div>
              {ts.length > 3 && <em>+{ts.length - 3} más</em>}
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
