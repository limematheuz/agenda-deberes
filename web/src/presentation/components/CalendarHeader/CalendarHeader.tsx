import type { Vista } from "../../../domain/agenda";
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

export function CalendarHeader({ titulo, vista, onVista, onMover, onHoy, onAnadir }: Props) {
  return (
    <header className="calhead">
      <div className="calhead-left">
        <button type="button" className="calhead-today" onClick={onHoy}>Hoy</button>
        <div className="calhead-arrows">
          <button type="button" onClick={() => onMover(-1)} aria-label="Anterior"><Icon name="chevron-left" size={16} /></button>
          <button type="button" onClick={() => onMover(1)} aria-label="Siguiente"><Icon name="chevron-right" size={16} /></button>
        </div>
        <h2 className="calhead-title cap">{titulo}</h2>
      </div>
      <div className="calctl">
        <select className="viewsel" value={vista} onChange={(e) => onVista(e.target.value as Vista)} aria-label="Vista">
          <option value="mes">Mes</option>
          <option value="semana">Semana</option>
          <option value="dia">Día</option>
        </select>
        <button type="button" className="primary calhead-create" onClick={onAnadir}>
          <Icon name="plus" size={15} />Crear
        </button>
      </div>
    </header>
  );
}
