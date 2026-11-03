import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Asignatura, Tarea } from "../../../domain/entities";
import { Dialog } from "../Dialog/Dialog";
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
  onReorder: (origen: string, destino: string) => void;
  categorias: readonly { id: string; nombre: string; abierta: boolean }[];
  categoriaPorAsignatura: Readonly<Record<string, string>>;
  onAlternarCategoria: (id: string) => void;
  onReorderCategorias: (origen: string, destino: string) => void;
  onCrearCategoriaRapida: (nombre: string) => string;
  onRenombrarCategoria: (id: string, nombre: string) => void;
  onBorrarCategoria: (id: string) => void;
}

export function Sidebar({ asignaturas, tareas, activa, onElegir, onGestionar, onSalir, seccion, onSeccion, contraida, onAlternar, onReorder, categorias, categoriaPorAsignatura, onAlternarCategoria, onReorderCategorias, onCrearCategoriaRapida, onRenombrarCategoria, onBorrarCategoria }: Props) {
  const [destino, setDestino] = useState<string | null>(null);
  const [categoriaEditando, setCategoriaEditando] = useState<string | null>(null);
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [categoriaABorrar, setCategoriaABorrar] = useState<string | null>(null);
  const [categoriaDestino, setCategoriaDestino] = useState<string | null>(null);
  const pendientes = tareas.filter((t) => !t.hecha);
  const categoriaParaBorrar = categorias.find((categoria) => categoria.id === categoriaABorrar);
  const cuenta = (id: string | null): number => pendientes.filter((t) => t.asignaturaId === id).length;
  const fila = (id: string, nombre: string, n: number, color?: string) => (
    <button key={id} className={`sub${activa === id ? " on" : ""}${color ? " draggable-subject" : ""}${destino === id ? " drop-before" : ""}`} onClick={() => onElegir(activa === id ? "todas" : id)} draggable={Boolean(color)} title={color ? `Arrastra ${nombre} a un día para crear un deber` : undefined} onDragStart={(e) => { if (color) { e.dataTransfer.setData("application/x-agenda-subject", id); e.dataTransfer.effectAllowed = "copyMove"; } }} onDragEnd={() => setDestino(null)} onDragOver={(e) => { if (color) { e.preventDefault(); setDestino(id); } }} onDragLeave={() => setDestino((actual) => actual === id ? null : actual)} onDrop={(e) => { if (!color) return; e.preventDefault(); setDestino(null); const origen = e.dataTransfer.getData("application/x-agenda-subject"); if (origen && origen !== id) onReorder(origen, id); }}>
      {color && <span className="drag-handle" aria-hidden="true">⠿</span>}
      {color ? <i className="dot" style={{ background: color }} /> : <span className="dot-gap" />}
      <span className="sub-name">{nombre}</span>
      <span className="count">{n}</span>
    </button>
  );
  const etiquetaContraida = (texto: string) => contraida ? { "data-tooltip": texto, "aria-label": texto } : {};

  return (
    <>
    <aside className={`sidebar${contraida ? " collapsed" : ""}`}>
      <div className="brand"><span className="logo"><img src="/brand/agenda-logo.svg" alt="" /></span><span className="side-label">Agenda de deberes</span><button className="more" onClick={onAlternar} aria-label={contraida ? "Abrir barra lateral" : "Cerrar barra lateral"}><Icon name={contraida ? "chevron-right" : "chevron-left"} size={16} /></button></div>
      <nav className="primary-nav" aria-label="Navegación principal">
        <button className={`nav-item${seccion === "resumen" ? " on" : ""}`} onClick={() => onSeccion("resumen")} aria-current={seccion === "resumen" ? "page" : undefined} {...etiquetaContraida("Resumen")}><Icon name="book" /><span className="side-label">Resumen</span></button>
        <button className={`nav-item${seccion === "buscar" ? " on" : ""}`} onClick={() => onSeccion("buscar")} aria-current={seccion === "buscar" ? "page" : undefined} {...etiquetaContraida("Buscar")}><Icon name="search" /><span className="side-label">Buscar</span></button>
        <button className={`nav-item${seccion === "calendario" ? " on" : ""}`} onClick={() => onSeccion("calendario")} aria-current={seccion === "calendario" ? "page" : undefined} {...etiquetaContraida("Calendario")}><Icon name="calendar" /><span className="side-label">Calendario</span></button>
      </nav>
      <hr />
      <p className="group-title">VISTAS</p>
      {fila("todas", "Ver todo", pendientes.length)}
      {cuenta(null) > 0 && fila("ninguna", "Sin asignatura", cuenta(null))}
      <hr />
      <button className="nav-item" onClick={onGestionar} {...etiquetaContraida("Organizar")}><Icon name="plus" /><span className="side-label">Organizar</span></button>
      <div className="subjects-heading"><p className="group-title subject-group">SECCIONES</p><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className="add-category-sidebar" aria-label="Más acciones" title="Más acciones"><Icon name="more-horizontal" size={17} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="sidebar-dropdown" side="right" align="start" sideOffset={9}><DropdownMenu.Item onSelect={onGestionar}><Icon name="sliders" size={19} />Editar</DropdownMenu.Item><DropdownMenu.Separator /><DropdownMenu.Item onSelect={() => { const id = onCrearCategoriaRapida("Nueva sección"); setCategoriaEditando(id); setNombreCategoria("Nueva sección"); }}><Icon name="plus" size={20} />Nueva sección</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div>
      {categorias.map((categoria) => {
        const items = asignaturas.filter((a) => (categoriaPorAsignatura[a.id] ?? "general") === categoria.id);
        const editando = categoriaEditando === categoria.id;
        return <section key={categoria.id} className={`subject-category${categoriaDestino === categoria.id ? " category-drop-before" : ""}`}><div className="category-row">{editando ? <form className="category-edit" onSubmit={(e) => { e.preventDefault(); const nombre = nombreCategoria.trim(); if (nombre) onRenombrarCategoria(categoria.id, nombre); setCategoriaEditando(null); }}><input aria-label="Nombre de sección" value={nombreCategoria} onChange={(e) => setNombreCategoria(e.target.value)} autoFocus /><button className="category-edit-save" type="submit" aria-label="Guardar sección">✓</button><button className="category-edit-cancel" type="button" aria-label="Cancelar edición" onClick={() => setCategoriaEditando(null)}><Icon name="x" size={13} /></button></form> : <><button className="category-toggle" onClick={() => onAlternarCategoria(categoria.id)} aria-expanded={categoria.abierta} draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-agenda-category", categoria.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setCategoriaDestino(null)} onDragOver={(e) => { e.preventDefault(); setCategoriaDestino(categoria.id); }} onDragLeave={() => setCategoriaDestino((actual) => actual === categoria.id ? null : actual)} onDrop={(e) => { e.preventDefault(); setCategoriaDestino(null); const origen = e.dataTransfer.getData("application/x-agenda-category"); if (origen && origen !== categoria.id) onReorderCategorias(origen, categoria.id); }}><Icon name="chevron-right" size={13} /><span>{categoria.nombre}</span></button><div className="category-actions"><DropdownMenu.Root><DropdownMenu.Trigger asChild><button className="category-more" aria-label={`Más opciones para ${categoria.nombre}`}><Icon name="more-horizontal" size={16} /></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="sidebar-dropdown sidebar-category-dropdown" side="right" align="start" sideOffset={8}><DropdownMenu.Item onSelect={() => { setCategoriaEditando(categoria.id); setNombreCategoria(categoria.nombre); }}><Icon name="pencil" size={18} />Renombrar</DropdownMenu.Item>{categoria.id !== "general" && <><DropdownMenu.Separator /><DropdownMenu.Item className="danger" onSelect={() => setCategoriaABorrar(categoria.id)}><Icon name="trash" size={18} />Quitar sección</DropdownMenu.Item></>}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root></div></>}</div>{categoria.abierta && items.map((a) => fila(a.id, a.nombre, cuenta(a.id), a.color))}</section>;
      })}
      <div className="spacer" />
      <button className="nav-item" onClick={onSalir} {...etiquetaContraida("Cerrar sesión")}><Icon name="logout" /><span className="side-label">Cerrar sesión</span></button>
    </aside>
    <Dialog abierto={Boolean(categoriaParaBorrar)} titulo="Quitar sección" onCerrar={() => setCategoriaABorrar(null)}>
      <div className="category-delete-dialog">
        <p>Vas a quitar <strong>{categoriaParaBorrar?.nombre}</strong>. Las materias de esta sección pasarán a General.</p>
        <div><button className="secondary" onClick={() => setCategoriaABorrar(null)}>Cancelar</button><button className="danger" onClick={() => { if (categoriaParaBorrar) onBorrarCategoria(categoriaParaBorrar.id); setCategoriaABorrar(null); }}>Quitar sección</button></div>
      </div>
    </Dialog>
    </>
  );
}
