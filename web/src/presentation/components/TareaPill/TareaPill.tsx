import type { Tarea } from "../../../domain/entities";
import { contieneEnlace } from "../../../domain/links";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import { colorVar } from "../../colors";
import { Icon } from "../Icon/Icon";
import "./TareaPill.css";

interface Props {
  tarea: Tarea;
  color?: string;
  detalle?: string;
  onToggle: (t: Tarea) => void;
  compacto?: boolean;
  mostrarControl?: boolean;
}

/** Evento del calendario: barra pastel en mes/semana al estilo Shadcn UI Kit, y con detalle en vista día. */
export function TareaPill({ tarea: t, color, detalle, onToggle, compacto = false, mostrarControl = false }: Props) {
  const u = urgencyOf(t);
  const tieneEnlace = contieneEnlace(t.descripcion);
  return (
    <div className={`pill${compacto ? " compact" : ""} u-${u}${t.hecha ? " done" : ""}`} style={colorVar(color)} title={t.descripcion ? `${t.titulo}\n${t.descripcion}` : t.titulo}>
      {mostrarControl && <input type="checkbox" checked={t.hecha} aria-label={`Hecho: ${t.titulo}`} onClick={(e) => e.stopPropagation()} onChange={() => onToggle(t)} />}
      {compacto ? (
        <span className="pill-inline">
          {detalle && <span className="pill-hour">{detalle}</span>}
          <strong>{t.titulo}</strong>
        </span>
      ) : (
        <span className="pill-text">
          <strong>{t.titulo}</strong>
          {detalle && <small>{detalle}</small>}
        </span>
      )}
      {tieneEnlace && <span className="pill-link-ind" title="Contiene enlace" aria-label="Contiene enlace"><Icon name="link" size={11} /></span>}
      {u !== "ninguna" && !compacto && <i className="udot" title={describeDays(t.fecha)} />}
    </div>
  );
}
