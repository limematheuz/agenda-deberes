import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { Asignatura, NuevaAsignatura } from "../../../domain/entities";
import { COLORES_PALETA_BASE, ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Dialog } from "../Dialog/Dialog";
import { Icon } from "../Icon/Icon";
import "./SubjectsManager.css";

export interface CategoriesModalProps {
  abierto: boolean;
  onCerrar: () => void;
  asignaturas: readonly Asignatura[];
  categorias: readonly { id: string; nombre: string }[];
  categoriaPorAsignatura: Readonly<Record<string, string>>;
  onAdd: (n: NuevaAsignatura) => Promise<Asignatura | void>;
  onUpdate: (id: string, cambios: Pick<Asignatura, "nombre" | "color">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onAsignarCategoria: (asignaturaId: string, categoriaId: string) => void;
  seccionInicialId?: string;
  editarAsignaturaId?: string | null;
}

export function CategoriesModal({
  abierto,
  onCerrar,
  asignaturas,
  categorias,
  categoriaPorAsignatura,
  onAdd,
  onUpdate,
  onRemove,
  onAsignarCategoria,
  seccionInicialId = "general",
  editarAsignaturaId = null,
}: CategoriesModalProps) {
  const [vista, setVista] = useState<"crear" | "editar" | "lista">("crear");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Formulario
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState<string>(COLORES_PALETA_BASE[1]);
  const [seccionId, setSeccionId] = useState<string>("general");
  const [categoriaABorrar, setCategoriaABorrar] = useState<Asignatura | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (editarAsignaturaId) {
      const encontrada = asignaturas.find((a) => a.id === editarAsignaturaId);
      if (encontrada) {
        setEditandoId(encontrada.id);
        setNombre(encontrada.nombre);
        setColor(encontrada.color);
        setSeccionId(categoriaPorAsignatura[encontrada.id] ?? "general");
        setVista("editar");
        return;
      }
    }
    // Si no es edición, abrir en modo creación
    setEditandoId(null);
    setNombre("");
    setColor(COLORES_PALETA_BASE[asignaturas.length % COLORES_PALETA_BASE.length]);
    setSeccionId(seccionInicialId || "general");
    setVista("crear");
    setCategoriaABorrar(null);
  }, [abierto, editarAsignaturaId, seccionInicialId, asignaturas, categoriaPorAsignatura]);

  const iniciarEdicion = (a: Asignatura): void => {
    setEditandoId(a.id);
    setNombre(a.nombre);
    setColor(a.color);
    setSeccionId(categoriaPorAsignatura[a.id] ?? "general");
    setVista("editar");
  };

  const iniciarCreacion = (): void => {
    setEditandoId(null);
    setNombre("");
    setColor(COLORES_PALETA_BASE[asignaturas.length % COLORES_PALETA_BASE.length]);
    setSeccionId(seccionInicialId || "general");
    setVista("crear");
  };

  const guardar = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const limpio = nombre.trim();
    if (!limpio) return;

    if (vista === "editar" && editandoId) {
      await onUpdate(editandoId, { nombre: limpio, color });
      onAsignarCategoria(editandoId, seccionId);
      setVista("lista");
    } else {
      const creada = await onAdd({ nombre: limpio, color });
      if (creada && typeof creada === "object" && "id" in creada && seccionId !== "general") {
        onAsignarCategoria(creada.id, seccionId);
      }
      onCerrar();
    }
  };

  const confirmarBorrado = async (): Promise<void> => {
    if (!categoriaABorrar) return;
    await onRemove(categoriaABorrar.id);
    setCategoriaABorrar(null);
    if (editandoId === categoriaABorrar.id) {
      setVista("lista");
    }
  };

  const tituloModal =
    vista === "editar"
      ? "Editar categoría"
      : vista === "lista"
        ? `Tus categorías (${asignaturas.length})`
        : "Nueva categoría";

  return (
    <Dialog abierto={abierto} titulo={tituloModal} onCerrar={onCerrar}>
      <div className="independent-manager">
        {/* Barra superior de cambio de vista */}
        <div className="independent-top-nav">
          {vista === "lista" ? (
            <button type="button" className="primary-subtle-btn" onClick={iniciarCreacion}>
              <Icon name="plus" size={14} />
              <span>Añadir categoría</span>
            </button>
          ) : (
            <button type="button" className="ghost-nav-btn" onClick={() => setVista("lista")}>
              <Icon name="list" size={14} />
              <span>Ver todas ({asignaturas.length})</span>
            </button>
          )}
        </div>

        {/* Vista Formulario (Crear / Editar) */}
        {(vista === "crear" || vista === "editar") && (
          <form className="friendly-category-form" onSubmit={(e) => void guardar(e)}>
            <div className="friendly-preview-box">
              <span className="friendly-preview-title">Vista previa:</span>
              <span className="cat-badge-btn preview-chip" style={{ "--c": color } as CSSProperties}>
                <i style={{ background: color }} />
                <span>{nombre.trim() || "Nombre de categoría"}</span>
              </span>
            </div>

            <label className="friendly-field">
              <span className="friendly-field-label">Nombre de la categoría</span>
              <input
                className="friendly-text-input"
                placeholder="Ej. Trabajo, Personal, Finanzas, Salud..."
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus
              />
            </label>

            <div className="friendly-field">
              <span className="friendly-field-label">Color en el calendario</span>
              <ColorPalettePicker value={color} onChange={setColor} ariaLabel="Color de la categoría" />
            </div>

            <label className="friendly-field">
              <span className="friendly-field-label">Sección donde se agrupará</span>
              <select
                className="native-select friendly-select"
                value={seccionId}
                onChange={(e) => setSeccionId(e.target.value)}
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre?.trim() || (c as any).name?.trim() || (c.id === "general" ? "General" : "Sección")}
                  </option>
                ))}
              </select>
            </label>

            <div className="friendly-form-footer">
              {vista === "editar" && editandoId && (
                <button
                  type="button"
                  className="task-action remove"
                  onClick={() => {
                    const actual = asignaturas.find((a) => a.id === editandoId);
                    if (actual) setCategoriaABorrar(actual);
                  }}
                  title="Eliminar esta categoría"
                >
                  <Icon name="trash" size={14} />
                  <span>Eliminar</span>
                </button>
              )}
              <div className="spacer" />
              {vista === "editar" && (
                <button type="button" className="secondary" onClick={() => setVista("lista")}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="primary" disabled={!nombre.trim()}>
                {vista === "editar" ? "Guardar cambios" : "Crear categoría"}
              </button>
            </div>
          </form>
        )}

        {/* Vista Lista de Categorías */}
        {vista === "lista" && (
          <div className="friendly-list-block">
            {asignaturas.length === 0 ? (
              <div className="friendly-empty-state">
                <p>No tienes ninguna categoría creada todavía.</p>
                <button type="button" className="primary" onClick={iniciarCreacion}>
                  <Icon name="plus" size={15} />
                  <span>Crear la primera</span>
                </button>
              </div>
            ) : (
              <ul className="friendly-cards-list">
                {asignaturas.map((a) => {
                  const sec = categorias.find((c) => c.id === (categoriaPorAsignatura[a.id] ?? "general")) ?? categorias[0];
                  return (
                    <li key={a.id} className="friendly-card-item">
                      <div className="friendly-card-left">
                        <span className="cat-badge-btn" style={{ "--c": a.color } as CSSProperties}>
                          <i style={{ background: a.color }} />
                          <span>{a.nombre}</span>
                        </span>
                        <span className="friendly-sec-pill">{sec?.nombre ?? "General"}</span>
                      </div>
                      <div className="friendly-card-actions">
                        <button
                          type="button"
                          className="manager-btn icon-only"
                          title="Editar"
                          aria-label={`Editar ${a.nombre}`}
                          onClick={() => iniciarEdicion(a)}
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                        <button
                          type="button"
                          className="manager-btn icon-only danger"
                          title="Eliminar"
                          aria-label={`Eliminar ${a.nombre}`}
                          onClick={() => setCategoriaABorrar(a)}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* Modal de confirmación para borrar */}
        {categoriaABorrar && (
          <div className="friendly-confirm-overlay">
            <div className="friendly-confirm-card">
              <h4>¿Eliminar "{categoriaABorrar.nombre}"?</h4>
              <p>Las tareas asignadas a esta categoría no se borrarán, pero perderán su etiqueta de color.</p>
              <div className="friendly-confirm-actions">
                <button type="button" className="secondary" onClick={() => setCategoriaABorrar(null)}>
                  Cancelar
                </button>
                <button type="button" className="primary danger" onClick={() => void confirmarBorrado()}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
