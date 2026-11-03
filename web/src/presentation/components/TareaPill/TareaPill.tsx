import type { Tarea } from "../../../domain/entities";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import { colorVar } from "../../colors";
import "./TareaPill.css";

interface Props {
  tarea: Tarea;
  color?: string;
  detalle?: string;
  onToggle: (t: Tarea) => void;
  compacto?: boolean;
  mostrarControl?: boolean;
}

/** Evento del calendario: compacto en mes, con detalle en semana y día. */
export function TareaPill({ tarea: t, color, detalle, onToggle, compacto = false, mostrarControl = false }: Props) {
  const u = urgencyOf(t);
  return (
    <div className={`pill${compacto ? " compact" : ""} u-${u}${t.hecha ? " done" : ""}`} style={colorVar(color)} title={t.titulo}>
      {mostrarControl && <input type="checkbox" checked={t.hecha} aria-label={`Hecho: ${t.titulo}`} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(t)} />}
      <span className="pill-text">
        <strong>{t.titulo}</strong>
        {detalle && <small>{detalle}</small>}
      </span>
      {u !== "ninguna" && <i className="udot" title={describeDays(t.fecha)} />}
    </div>
  );
}
