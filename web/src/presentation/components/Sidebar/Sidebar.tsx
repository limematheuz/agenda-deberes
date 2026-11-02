import type { Asignatura, Tarea } from "../../../domain/entities";
import { Icon } from "../Icon/Icon";
import "./Sidebar.css";

interface Props {
  asignaturas: readonly Asignatura[];
  tareas: readonly Tarea[];
  activa: string;
  onElegir: (id: string) => void;
  onGestionar: () => void;
  onSalir: () => void;
  seccion: "resumen" | "buscar" | "calendario";
  onSeccion: (seccion: "resumen" | "buscar" | "calendario") => void;
  contraida: boolean;
  onAlternar: () => void;
}

export function Sidebar({ asignaturas, tareas, activa, onElegir, onGestionar, onSalir, seccion, onSeccion, contraida, onAlternar }: Props) {
  const pendientes = tareas.filter((t) => !t.hecha);
  const cuenta = (id: string | null): number => pendientes.filter((t) => t.asignaturaId === id).length;
  const fila = (id: string, nombre: string, n: number, color?: string) => (
    <button key={id} className={`sub${activa === id ? " on" : ""}${color ? " draggable-subject" : ""}`} onClick={() => onElegir(id)} draggable={Boolean(color)} title={color ? `Arrastra ${nombre} a un día para crear un deber` : undefined} onDragStart={(e) => { if (color) { e.dataTransfer.setData("application/x-agenda-subject", id); e.dataTransfer.effectAllowed = "copy"; } }}>
      {color && <span className="drag-handle" aria-hidden="true">⠿</span>}
      {color ? <i className="dot" style={{ background: color }} /> : <span className="dot-gap" />}
      <span className="sub-name">{nombre}</span>
      <span className="count">{n}</span>
    </button>
  );
  const etiquetaContraida = (texto: string) => contraida ? { "data-tooltip": texto, "aria-label": texto } : {};

  return (
    <aside className={`sidebar${contraida ? " collapsed" : ""}`}>
      <div className="brand"><span className="logo"><img src="/brand/agenda-logo.svg" alt="" /></span><span className="side-label">Agenda de deberes</span><button className="more" onClick={onAlternar} aria-label={contraida ? "Abrir barra lateral" : "Cerrar barra lateral"}><Icon name={contraida ? "chevron-right" : "chevron-left"} size={16} /></button></div>
      <nav className="primary-nav" aria-label="Navegación principal">
        <button className={`nav-item${seccion === "resumen" ? " on" : ""}`} onClick={() => onSeccion("resumen")} aria-current={seccion === "resumen" ? "page" : undefined} {...etiquetaContraida("Resumen")}><Icon name="book" /><span className="side-label">Resumen</span></button>
        <button className={`nav-item${seccion === "buscar" ? " on" : ""}`} onClick={() => onSeccion("buscar")} aria-current={seccion === "buscar" ? "page" : undefined} {...etiquetaContraida("Buscar")}><Icon name="search" /><span className="side-label">Buscar</span></button>
        <button className={`nav-item${seccion === "calendario" ? " on" : ""}`} onClick={() => onSeccion("calendario")} aria-current={seccion === "calendario" ? "page" : undefined} {...etiquetaContraida("Calendario")}><Icon name="calendar" /><span className="side-label">Calendario</span></button>
      </nav>
      <hr />
      <p className="group-title">VISTAS</p>
      {fila("todas", "Todos los deberes", pendientes.length)}
      {cuenta(null) > 0 && fila("ninguna", "Sin asignatura", cuenta(null))}
      <hr />
      <button className="nav-item" onClick={onGestionar} {...etiquetaContraida("Gestionar asignaturas")}><Icon name="plus" /><span className="side-label">Gestionar asignaturas</span></button>
      <p className="group-title subject-group">ASIGNATURAS</p>
      {asignaturas.map((a) => fila(a.id, a.nombre, cuenta(a.id), a.color))}
      <div className="spacer" />
      <button className="nav-item" onClick={onSalir} {...etiquetaContraida("Cerrar sesión")}><Icon name="logout" /><span className="side-label">Cerrar sesión</span></button>
    </aside>
  );
}
