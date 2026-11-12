import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { Asignatura, Tarea } from "../../../domain/entities";
import { ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Dialog } from "../Dialog/Dialog";
import { Icon } from "../Icon/Icon";
import "./Sidebar.css";

export interface UserProfile {
  nombre: string;
  curso: string;
  email: string;
  color: string;
}

export type SeccionApp = "resumen" | "calendario" | "horario" | "recordatorios" | "notas";

export function obtenerIniciales(nombre: string, email: string): string {
  const base = (nombre.trim() || email.split("@")[0] || "U").trim();
  const partes = base.split(/[\s._-]+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

interface Props {
  asignaturas: readonly Asignatura[];
  tareas: readonly Tarea[];
  activa: string;
  onElegir: (id: string) => void;
  onAbrirGestor: (opciones?: {
    tab?: "asignaturas" | "secciones";
    seccionId?: string;
    editarAsignaturaId?: string | null;
    editarSeccionId?: string | null;
  }) => void;
  onSalir: () => void;
  seccion: SeccionApp;
  onSeccion: (seccion: SeccionApp) => void;
  recordatoriosPendientes?: number;
  notasCount?: number;
  contraida: boolean;
  onAlternar: () => void;
  onReorder: (origen: string, destino: string) => void;
  categorias: readonly { id: string; nombre: string; abierta: boolean }[];
  categoriaPorAsignatura: Readonly<Record<string, string>>;
  onAsignarCategoria: (asignaturaId: string, categoriaId: string) => void;
  onAlternarCategoria: (id: string) => void;
  onReorderCategorias: (origen: string, destino: string) => void;
  onBorrarCategoria: (id: string) => void;
  onRemoveAsignatura?: (id: string) => Promise<void>;
  perfil: UserProfile;
  onGuardarPerfil: (cambios: Pick<UserProfile, "nombre" | "curso" | "color">) => void;
  textoBusqueda?: string;
  onTextoBusqueda?: (texto: string) => void;
}

export function Sidebar({
  asignaturas,
  tareas,
  activa,
  onElegir,
  onAbrirGestor,
  onSalir,
  seccion,
  onSeccion,
  recordatoriosPendientes = 0,
  notasCount = 0,
  contraida,
  onAlternar,
  onReorder,
  categorias,
  categoriaPorAsignatura,
  onAsignarCategoria,
  onAlternarCategoria,
  onReorderCategorias,
  onBorrarCategoria,
  onRemoveAsignatura,
  perfil,
  onGuardarPerfil,
  textoBusqueda = "",
  onTextoBusqueda,
}: Props) {
  const [destinoAsig, setDestinoAsig] = useState<string | null>(null);
  const [arrastrandoAsigId, setArrastrandoAsigId] = useState<string | null>(null);
  const [seccionDropActiva, setSeccionDropActiva] = useState<string | null>(null);
  const [categoriaABorrar, setCategoriaABorrar] = useState<string | null>(null);
  const [asignaturaABorrar, setAsignaturaABorrar] = useState<Asignatura | null>(null);
  const [categoriaDestino, setCategoriaDestino] = useState<string | null>(null);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [nombrePerfil, setNombrePerfil] = useState(perfil.nombre);
  const [cursoPerfil, setCursoPerfil] = useState(perfil.curso);
  const [colorPerfil, setColorPerfil] = useState(perfil.color);

  const pendientes = tareas.filter((t) => !t.hecha);
  const categoriaParaBorrar = categorias.find((categoria) => categoria.id === categoriaABorrar);
  const nombreVisible = perfil.nombre.trim() || perfil.email.split("@")[0] || "Usuario";
  const etiquetaCursoLimpia = /^(CFGS|Mi curso)/i.test(perfil.curso.trim()) ? "Personal" : perfil.curso.trim();
  const cursoBadge = etiquetaCursoLimpia || "Personal";
  const iniciales = obtenerIniciales(perfil.nombre, perfil.email);

  const abrirEditorPerfil = (): void => {
    setNombrePerfil(perfil.nombre || nombreVisible);
    setCursoPerfil(cursoBadge);
    setColorPerfil(perfil.color);
    setEditandoPerfil(true);
  };

  const cuenta = (id: string | null): number => pendientes.filter((t) => t.asignaturaId === id).length;
  const etiquetaContraida = (texto: string) => (contraida ? { "data-tooltip": texto, "aria-label": texto } : {});

  const filaAsignatura = (a: Asignatura, categoriaIdActual: string) => {
    const n = cuenta(a.id);
    const esActiva = activa === a.id;
    const esArrastrada = arrastrandoAsigId === a.id;
    const esDestino = destinoAsig === a.id;

    return (
      <div
        key={a.id}
        className={`sub-row-wrap${esActiva ? " on" : ""}${esArrastrada ? " is-dragging" : ""}${esDestino ? " drop-before" : ""}`}
        draggable
        onDragStart={(e) => {
          setArrastrandoAsigId(a.id);
          e.dataTransfer.setData("application/x-agenda-subject", a.id);
          e.dataTransfer.effectAllowed = "copyMove";
        }}
        onDragEnd={() => {
          setArrastrandoAsigId(null);
          setDestinoAsig(null);
          setSeccionDropActiva(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (arrastrandoAsigId !== a.id) {
            setDestinoAsig(a.id);
          }
        }}
        onDragLeave={() => setDestinoAsig((actual) => (actual === a.id ? null : actual))}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDestinoAsig(null);
          setSeccionDropActiva(null);
          const origen = e.dataTransfer.getData("application/x-agenda-subject");
          if (origen) {
            onAsignarCategoria(origen, categoriaIdActual);
            if (origen !== a.id) onReorder(origen, a.id);
          }
        }}
      >
        <button
          type="button"
          className={`sub${esActiva ? " on" : ""}`}
          onClick={() => onElegir(esActiva ? "todas" : a.id)}
          title={`Filtrar por ${a.nombre} o arrastrar a un día / sección`}
        >
          <span className="drag-handle" aria-hidden="true">⠿</span>
          <i className="dot" style={{ background: a.color }} />
          <span className="sub-name">{a.nombre}</span>
          {n > 0 && <span className="count">{n}</span>}
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button type="button" className="sub-more-btn" aria-label={`Opciones de ${a.nombre}`}>
              <Icon name="more-horizontal" size={14} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="sidebar-dropdown sidebar-category-dropdown" side="right" align="start" sideOffset={8}>
              <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "asignaturas", editarAsignaturaId: a.id })}>
                <Icon name="pencil" size={16} />Editar categoría
              </DropdownMenu.Item>
              {categorias.length > 1 && (
                <>
                  <DropdownMenu.Separator />
                  <div className="dropdown-sublabel">Mover a sección</div>
                  {categorias
                    .filter((c) => c.id !== categoriaIdActual)
                    .map((c) => (
                      <DropdownMenu.Item key={c.id} onSelect={() => onAsignarCategoria(a.id, c.id)}>
                        <Icon name="chevron-right" size={14} />{c.nombre}
                      </DropdownMenu.Item>
                    ))}
                </>
              )}
              {onRemoveAsignatura && (
                <>
                  <DropdownMenu.Separator />
                  <DropdownMenu.Item className="danger" onSelect={() => setAsignaturaABorrar(a)}>
                    <Icon name="trash" size={16} />Eliminar categoría
                  </DropdownMenu.Item>
                </>
              )}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    );
  };

  return (
    <>
      <aside className={`sidebar${contraida ? " collapsed" : ""}`}>
        <div className="brand">
          <span className="logo"><img src="/brand/calendarappio-logo.svg?v=3" alt="" /></span>
          <span className="side-label">CalendarAppio</span>
          <button className="more" onClick={onAlternar} aria-label={contraida ? "Abrir barra lateral" : "Cerrar barra lateral"}>
            <Icon name={contraida ? "chevron-right" : "chevron-left"} size={16} />
          </button>
        </div>

        {contraida ? (
          <button
            type="button"
            className="nav-item sidebar-search-collapsed"
            onClick={onAlternar}
            title="Buscar..."
            aria-label="Buscar"
            {...etiquetaContraida("Buscar")}
          >
            <Icon name="search" size={17} />
          </button>
        ) : (
          <div className="sidebar-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Buscar..."
              value={textoBusqueda}
              onChange={(e) => onTextoBusqueda?.(e.target.value)}
              aria-label="Buscar tareas o notas"
            />
            {textoBusqueda && (
              <button
                type="button"
                className="sidebar-search-clear"
                onClick={() => onTextoBusqueda?.("")}
                aria-label="Limpiar búsqueda"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>
        )}

        <nav className="primary-nav" aria-label="Navegación principal">
          <button className={`nav-item${seccion === "resumen" ? " on" : ""}`} onClick={() => onSeccion("resumen")} aria-current={seccion === "resumen" ? "page" : undefined} {...etiquetaContraida("Resumen")}>
            <Icon name="book" /><span className="side-label">Resumen</span>
          </button>
          <button className={`nav-item${seccion === "calendario" ? " on" : ""}`} onClick={() => onSeccion("calendario")} aria-current={seccion === "calendario" ? "page" : undefined} {...etiquetaContraida("Calendario")}>
            <Icon name="calendar" /><span className="side-label">Calendario</span>
          </button>
          <button className={`nav-item${seccion === "horario" ? " on" : ""}`} onClick={() => onSeccion("horario")} aria-current={seccion === "horario" ? "page" : undefined} {...etiquetaContraida("Horario")}>
            <Icon name="clock" /><span className="side-label">Horario</span>
          </button>
          <button className={`nav-item${seccion === "recordatorios" ? " on" : ""}`} onClick={() => onSeccion("recordatorios")} aria-current={seccion === "recordatorios" ? "page" : undefined} {...etiquetaContraida("Recordatorios")}>
            <Icon name="bell" /><span className="side-label">Recordatorios</span>
            {recordatoriosPendientes > 0 && <span className="count side-label">{recordatoriosPendientes}</span>}
          </button>
          <button className={`nav-item${seccion === "notas" ? " on" : ""}`} onClick={() => onSeccion("notas")} aria-current={seccion === "notas" ? "page" : undefined} {...etiquetaContraida("Bloc de notas")}>
            <Icon name="note" /><span className="side-label">Bloc de notas</span>
            {notasCount > 0 && <span className="count side-label">{notasCount}</span>}
          </button>
        </nav>

        <hr />

        {/* Un único punto de entrada para crear/gestionar: evita botones duplicados por el sidebar. */}
        <div className="subjects-heading">
          <p className="group-title subject-group">CATEGORÍAS</p>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                className={contraida ? "nav-item" : "sidebar-add-btn"}
                title="Crear o gestionar"
                aria-label="Crear categoría o sección"
                {...etiquetaContraida("Crear o gestionar")}
              >
                <Icon name="plus" size={contraida ? 18 : 15} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="sidebar-dropdown sidebar-category-dropdown" side="right" align="start" sideOffset={8}>
                <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "asignaturas" })}>
                  <Icon name="book" size={16} />Nueva categoría
                </DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "secciones" })}>
                  <Icon name="menu" size={16} />Nueva sección
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "asignaturas" })}>
                  <Icon name="sliders" size={16} />Gestionar todo
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        <div className="sections-stack">
          {categorias.map((categoria) => {
            const items = asignaturas.filter((a) => (categoriaPorAsignatura[a.id] ?? "general") === categoria.id);
            const dropActiva = seccionDropActiva === categoria.id;

            return (
              <section
                key={categoria.id}
                className={`subject-category${categoriaDestino === categoria.id ? " category-drop-before" : ""}${dropActiva ? " section-drop-active" : ""}`}
                onDragOver={(e) => {
                  if (arrastrandoAsigId) {
                    e.preventDefault();
                    setSeccionDropActiva(categoria.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setSeccionDropActiva((actual) => (actual === categoria.id ? null : actual));
                  }
                }}
                onDrop={(e) => {
                  const asigId = e.dataTransfer.getData("application/x-agenda-subject");
                  if (asigId) {
                    e.preventDefault();
                    setSeccionDropActiva(null);
                    setDestinoAsig(null);
                    onAsignarCategoria(asigId, categoria.id);
                    if (!categoria.abierta) onAlternarCategoria(categoria.id);
                  }
                }}
              >
                <div className="category-row">
                  <button
                    type="button"
                    className="category-toggle"
                    onClick={() => onAlternarCategoria(categoria.id)}
                    aria-expanded={categoria.abierta}
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData("application/x-agenda-category", categoria.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragEnd={() => setCategoriaDestino(null)}
                    onDragOver={(e) => {
                      if (!arrastrandoAsigId) {
                        e.preventDefault();
                        setCategoriaDestino(categoria.id);
                      }
                    }}
                    onDragLeave={() => setCategoriaDestino((actual) => (actual === categoria.id ? null : actual))}
                    onDrop={(e) => {
                      const origenCat = e.dataTransfer.getData("application/x-agenda-category");
                      if (origenCat && origenCat !== categoria.id) {
                        e.preventDefault();
                        e.stopPropagation();
                        setCategoriaDestino(null);
                        onReorderCategorias(origenCat, categoria.id);
                      }
                    }}
                  >
                    <Icon name="chevron-right" size={13} />
                    <span>{categoria.nombre}</span>
                  </button>

                  <div className="category-actions">
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" className="category-more" aria-label={`Opciones de ${categoria.nombre}`}>
                          <Icon name="more-horizontal" size={15} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className="sidebar-dropdown sidebar-category-dropdown" side="right" align="start" sideOffset={8}>
                          <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "asignaturas", seccionId: categoria.id })}>
                            <Icon name="plus" size={16} />Nueva categoría aquí
                          </DropdownMenu.Item>
                          <DropdownMenu.Item onSelect={() => onAbrirGestor({ tab: "secciones", editarSeccionId: categoria.id })}>
                            <Icon name="pencil" size={16} />Editar sección
                          </DropdownMenu.Item>
                          {categoria.id !== "general" && (
                            <>
                              <DropdownMenu.Separator />
                              <DropdownMenu.Item className="danger" onSelect={() => setCategoriaABorrar(categoria.id)}>
                                <Icon name="trash" size={16} />Eliminar sección
                              </DropdownMenu.Item>
                            </>
                          )}
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                </div>

                {categoria.abierta && (
                  <div className="category-items-list">
                    {items.length === 0 ? (
                      <p className="empty-section-dropzone">
                        {dropActiva ? "Suelta aquí la categoría" : "Arrastra aquí una categoría"}
                      </p>
                    ) : (
                      items.map((a) => filaAsignatura(a, categoria.id))
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="spacer" />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="user-profile-btn" {...etiquetaContraida(`${nombreVisible} · ${cursoBadge}`)} aria-label={`Cuenta de ${nombreVisible}`}>
              <span className="user-avatar" style={{ background: perfil.color }}>{iniciales}</span>
              <span className="user-info side-label">
                <span className="user-name-row">
                  <strong>{nombreVisible}</strong>
                  <span className="user-course-badge">{cursoBadge}</span>
                </span>
                <small>{perfil.email || "Mi cuenta"}</small>
              </span>
              <span className="user-more side-label"><Icon name="more-horizontal" size={16} /></span>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="sidebar-dropdown sidebar-profile-dropdown" side="right" align="end" sideOffset={10}>
              <div className="profile-menu-header">
                <span className="user-avatar" style={{ background: perfil.color }}>{iniciales}</span>
                <div>
                  <div className="user-name-row">
                    <strong>{nombreVisible}</strong>
                    <span className="user-course-badge">{cursoBadge}</span>
                  </div>
                  <small>{perfil.email || "Sesión activa"}</small>
                </div>
              </div>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={abrirEditorPerfil}>
                <Icon name="user" size={17} />Editar perfil
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item className="danger" onSelect={onSalir}>
                <Icon name="logout" size={17} />Cerrar sesión
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </aside>

      <Dialog abierto={editandoPerfil} titulo="Tu perfil" onCerrar={() => setEditandoPerfil(false)}>
        <form
          className="profile-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            onGuardarPerfil({ nombre: nombrePerfil.trim(), curso: cursoPerfil.trim(), color: colorPerfil });
            setEditandoPerfil(false);
          }}
        >
          <div className="profile-edit-preview">
            <span className="user-avatar large" style={{ background: colorPerfil }}>{obtenerIniciales(nombrePerfil, perfil.email)}</span>
            <div>
              <div className="user-name-row">
                <strong>{nombrePerfil.trim() || nombreVisible}</strong>
                <span className="user-course-badge">{cursoPerfil.trim() || "Personal"}</span>
              </div>
              <small>{perfil.email || "Mi cuenta"}</small>
            </div>
          </div>
          <label>
            <span>Nombre visible</span>
            <input value={nombrePerfil} onChange={(e) => setNombrePerfil(e.target.value)} placeholder="Ej. Matheus" autoFocus />
          </label>
          <label>
            <span>Rol, equipo o etiqueta (se muestra como badge)</span>
            <input value={cursoPerfil} onChange={(e) => setCursoPerfil(e.target.value)} placeholder="Ej. Trabajo, Diseño, Personal, Freelance…" />
          </label>
          <div className="profile-color-picker">
            <span>Color de perfil</span>
            <ColorPalettePicker value={colorPerfil} onChange={setColorPerfil} ariaLabel="Color de perfil" />
          </div>
          <div className="profile-edit-actions">
            <button type="button" className="secondary" onClick={() => setEditandoPerfil(false)}>Cancelar</button>
            <button type="submit" className="primary">Guardar perfil</button>
          </div>
        </form>
      </Dialog>

      <Dialog abierto={Boolean(categoriaParaBorrar)} titulo="Eliminar sección" onCerrar={() => setCategoriaABorrar(null)}>
        <div className="category-delete-dialog">
          <p>Vas a eliminar <strong>{categoriaParaBorrar?.nombre}</strong>. Las categorías de esta sección pasarán a General.</p>
          <div>
            <button className="secondary" onClick={() => setCategoriaABorrar(null)}>Cancelar</button>
            <button className="danger" onClick={() => { if (categoriaParaBorrar) onBorrarCategoria(categoriaParaBorrar.id); setCategoriaABorrar(null); }}>Eliminar sección</button>
          </div>
        </div>
      </Dialog>

      <Dialog abierto={Boolean(asignaturaABorrar)} titulo="Eliminar categoría" onCerrar={() => setAsignaturaABorrar(null)}>
        <div className="category-delete-dialog">
          <p>¿Seguro que quieres eliminar <strong>{asignaturaABorrar?.nombre}</strong>? Las tareas existentes se conservarán sin categoría.</p>
          <div>
            <button className="secondary" onClick={() => setAsignaturaABorrar(null)}>Cancelar</button>
            <button className="danger" onClick={() => { if (asignaturaABorrar && onRemoveAsignatura) void onRemoveAsignatura(asignaturaABorrar.id); setAsignaturaABorrar(null); }}>Eliminar categoría</button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
