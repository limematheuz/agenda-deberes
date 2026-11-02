import type { Vista } from "../../../domain/agenda";
import { fromISO } from "../../../domain/dates";
import type { ISODate } from "../../../domain/entities";
import { Icon } from "../Icon/Icon";
import "./CalendarHeader.css";

interface Props {
  titulo: string;
  inicio: ISODate;
  fin: ISODate;
  vista: Vista;
  onVista: (v: Vista) => void;
  onMover: (delta: number) => void;
  onHoy: () => void;
  onAnadir: () => void;
}

const fmt = (s: ISODate): string => fromISO(s).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

export function CalendarHeader({ titulo, inicio, fin, vista, onVista, onMover, onHoy, onAnadir }: Props) {
  const hoy = new Date();
  return (
    <header className="calhead">
      <div className="heading">
        <div className="badge"><span>{hoy.toLocaleDateString("es-ES", { month: "short" }).replace(".", "")}</span><b>{hoy.getDate()}</b></div>
        <div>
          <h2 className="cap">{titulo}</h2>
          <p className="muted range">{fmt(inicio)} – {fmt(fin)}</p>
        </div>
      </div>
      <div className="calctl">
        <div className="pager">
          <button onClick={() => onMover(-1)} aria-label="Anterior"><Icon name="chevron-left" /></button>
          <button onClick={onHoy}>Hoy</button>
          <button onClick={() => onMover(1)} aria-label="Siguiente"><Icon name="chevron-right" /></button>
        </div>
        <select className="viewsel" value={vista} onChange={(e) => onVista(e.target.value as Vista)} aria-label="Vista">
          <option value="mes">Vista mes</option>
          <option value="semana">Vista semana</option>
          <option value="dia">Vista día</option>
        </select>
        <button className="primary" onClick={onAnadir}><Icon name="plus" />Añadir deber</button>
      </div>
    </header>
  );
}
