import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import type { Asignatura, NuevaAsignatura } from "../../../domain/entities";
import { COLORES_PALETA_BASE, ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Icon } from "../Icon/Icon";
import "../../styles/list.css";
import "./SubjectsManager.css";

export interface CategoryItem {
  id: string;
  nombre: string;
  abierta: boolean;
}

interface Props {
  asignaturas: readonly Asignatura[];
  onAdd: (n: NuevaAsignatura) => Promise<Asignatura | void>;
  onUpdate: (id: string, cambios: Pick<Asignatura, "nombre" | "color">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  categorias: readonly CategoryItem[];
  categoriaPorAsignatura: Readonly<Record<string, string>>;
  onAsignarCategoria: (asignaturaId: string, categoriaId: string) => void;
  onCrearCategoria: (nombre: string) => string;
  onRenombrarCategoria: (id: string, nombre: string) => void;
  onBorrarCategoria: (id: string) => void;
  onReorderCategorias: (origen: string, destino: string) => void;
  tabInicial?: "asignaturas" | "secciones";
  seccionPreseleccionada?: string;
  asignaturaEditarInicial?: string | null;
  seccionEditarInicial?: string | null;
}

export function SubjectsManager({
  asignaturas,
  onAdd,
  onUpdate,
  onRemove,
  categorias,
  categoriaPorAsignatura,
  onAsignarCategoria,
  onCrearCategoria,
  onRenombrarCategoria,
  onBorrarCategoria,
  onReorderCategorias,
  tabInicial = "asignaturas",
  seccionPreseleccionada = "general",
  asignaturaEditarInicial = null,
  seccionEditarInicial = null,
}: Props) {
  const [tab, setTab] = useState<"asignaturas" | "secciones">(tabInicial);

  // Estado para crear asignatura
  const [nombreAsig, setNombreAsig] = useState("");
  const [colorAsig, setColorAsig] = useState<string>(COLORES_PALETA_BASE[1]);
  const [categoriaNuevaAsig, setCategoriaNuevaAsig] = useState<string>(seccionPreseleccionada || "general");

  // Estado para editar asignatura
  const [editandoAsigId, setEditandoAsigId] = useState<string | null>(asignaturaEditarInicial);
  const [borradorAsig, setBorradorAsig] = useState<{ nombre: string; color: string; categoriaId: string } | null>(null);
  const [aBorrarAsig, setABorrarAsig] = useState<Asignatura | null>(null);

  // Estado para crear y editar secciones
  const [nombreNuevaSeccion, setNombreNuevaSeccion] = useState("");
  const [editandoSeccionId, setEditandoSeccionId] = useState<string | null>(seccionEditarInicial);
  const [nombreSeccionEdit, setNombreSeccionEdit] = useState("");
  const [seccionABorrar, setSeccionABorrar] = useState<CategoryItem | null>(null);

  useEffect(() => {
    setTab(tabInicial);
  }, [tabInicial]);

  useEffect(() => {
    if (seccionPreseleccionada) setCategoriaNuevaAsig(seccionPreseleccionada);
  }, [seccionPreseleccionada]);

  useEffect(() => {
    if (asignaturaEditarInicial) {
      const encontrada = asignaturas.find((a) => a.id === asignaturaEditarInicial);
      if (encontrada) {
        setTab("asignaturas");
        setEditandoAsigId(encontrada.id);
        setBorradorAsig({
          nombre: encontrada.nombre,
          color: encontrada.color,
          categoriaId: categoriaPorAsignatura[encontrada.id] ?? "general",
        });
      }
    }
  }, [asignaturaEditarInicial, asignaturas, categoriaPorAsignatura]);

  useEffect(() => {
    if (seccionEditarInicial) {
      const encontrada = categorias.find((c) => c.id === seccionEditarInicial);
      if (encontrada) {
        setTab("secciones");
        setEditandoSeccionId(encontrada.id);
        setNombreSeccionEdit(encontrada.nombre);
      }
    }
  }, [seccionEditarInicial, categorias]);

  const crearAsignatura = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const limpio = nombreAsig.trim();
    if (!limpio) return;
    const creada = await onAdd({ nombre: limpio, color: colorAsig });
    if (creada && typeof creada === "object" && "id" in creada && categoriaNuevaAsig !== "general") {
      onAsignarCategoria(creada.id, categoriaNuevaAsig);
    }
    setNombreAsig("");
    const siguienteColor = COLORES_PALETA_BASE[(asignaturas.length + 1) % COLORES_PALETA_BASE.length];
    setColorAsig(siguienteColor);
  };

  const guardarEdicionAsignatura = (id: string): void => {
    if (!borradorAsig || !borradorAsig.nombre.trim()) return;
    void onUpdate(id, { nombre: borradorAsig.nombre.trim(), color: borradorAsig.color });
    onAsignarCategoria(id, borradorAsig.categoriaId);
    setEditandoAsigId(null);
    setBorradorAsig(null);
  };

  const crearSeccion = (e: FormEvent): void => {
    e.preventDefault();
    const limpio = nombreNuevaSeccion.trim();
    if (!limpio) return;
    onCrearCategoria(limpio);
    setNombreNuevaSeccion("");
  };

  const guardarEdicionSeccion = (id: string): void => {
    const limpio = nombreSeccionEdit.trim();
    if (limpio) onRenombrarCategoria(id, limpio);
    setEditandoSeccionId(null);
    setNombreSeccionEdit("");
  };

  const moverSeccion = (index: number, direccion: -1 | 1): void => {
    const destinoIndex = index + direccion;
    if (destinoIndex < 0 || destinoIndex >= categorias.length) return;
    onReorderCategorias(categorias[index].id, categorias[destinoIndex].id);
  };

  return (
    <div className="subjects-manager">
      <div className="manager-tabs" role="tablist" aria-label="Separación de categorías y secciones">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "asignaturas"}
          className={`manager-tab${tab === "asignaturas" ? " active" : ""}`}
          onClick={() => setTab("asignaturas")}
        >
          <span>Categorías</span>
          <small>{asignaturas.length}</small>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "secciones"}
          className={`manager-tab${tab === "secciones" ? " active" : ""}`}
          onClick={() => setTab("secciones")}
        >
          <span>Secciones</span>
        </button>
      </div>

      {tab === "asignaturas" ? (
        <div className="manager-pane">
          <form className="manager-create-card" onSubmit={(e) => void crearAsignatura(e)}>
            <div className="create-card-header">
              <div>
                <strong>Nueva categoría</strong>
                <span>Elige su nombre, la sección donde irá y su color en el calendario</span>
              </div>
              <span className="subject-live-preview" style={{ "--c": colorAsig } as CSSProperties}>
                <i style={{ background: colorAsig }} />
                <b>{nombreAsig.trim() || "Vista previa"}</b>
              </span>
            </div>

            <div className="create-card-grid">
              <label className="create-field">
                <span>Nombre de la categoría</span>
                <input
                  placeholder="Ej. Trabajo, Personal, Proyecto, Finanzas…"
                  value={nombreAsig}
                  onChange={(e) => setNombreAsig(e.target.value)}
                />
              </label>
              <label className="create-field">
                <span>Sección</span>
                <select
                  className="native-select"
                  value={categoriaNuevaAsig}
                  onChange={(e) => setCategoriaNuevaAsig(e.target.value)}
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="create-card-footer">
              <div className="create-color-wrap">
                <span className="create-color-label">Color:</span>
                <ColorPalettePicker value={colorAsig} onChange={setColorAsig} ariaLabel="Color de la nueva categoría" />
              </div>
              <button type="submit" className="primary create-submit-btn" disabled={!nombreAsig.trim()}>
                <Icon name="plus" size={15} />Crear categoría
              </button>
            </div>
          </form>

          <div className="manager-list-block">
            <div className="manager-list-head">
              <strong>Tus categorías ({asignaturas.length})</strong>
              <span>Usa el lápiz para editar o la papelera para eliminar</span>
            </div>

            {asignaturas.length === 0 ? (
              <p className="muted manager-empty">Aún no hay categorías creadas. Añade la primera arriba.</p>
            ) : (
              <ul className="manager-items-list">
                {asignaturas.map((a) => {
                  const esEditando = editandoAsigId === a.id && borradorAsig !== null;
                  const catActual = categorias.find((c) => c.id === (categoriaPorAsignatura[a.id] ?? "general")) ?? categorias[0];

                  return (
                    <li
                      key={a.id}
                      className={`manager-item-card${esEditando ? " editing" : ""}`}
                      style={{ "--subject-color": esEditando && borradorAsig ? borradorAsig.color : a.color } as CSSProperties}
                    >
                      {esEditando && borradorAsig ? (
                        <div className="subject-editor-panel">
                          <div className="subject-editor-grid">
                            <label className="create-field">
                              <span>Nombre</span>
                              <input
                                value={borradorAsig.nombre}
                                onChange={(e) => setBorradorAsig({ ...borradorAsig, nombre: e.target.value })}
                                autoFocus
                              />
                            </label>
                            <label className="create-field">
                              <span>Sección</span>
                              <select
                                className="native-select"
                                value={borradorAsig.categoriaId}
                                onChange={(e) => setBorradorAsig({ ...borradorAsig, categoriaId: e.target.value })}
                              >
                                {categorias.map((c) => (
                                  <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="subject-editor-bottom">
                            <div className="create-color-wrap">
                              <span className="create-color-label">Color:</span>
                              <ColorPalettePicker
                                value={borradorAsig.color}
                                onChange={(c) => setBorradorAsig({ ...borradorAsig, color: c })}
                                ariaLabel={`Color para ${a.nombre}`}
                              />
                            </div>
                            <div className="subject-editor-actions">
                              <button
                                type="button"
                                className="manager-btn ghost"
                                onClick={() => { setEditandoAsigId(null); setBorradorAsig(null); }}
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                className="manager-btn save"
                                onClick={() => guardarEdicionAsignatura(a.id)}
                              >
                                Guardar cambios
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="manager-item-row">
                          <span className="subject-color-pill" style={{ background: a.color }} />
                          <div className="manager-item-info">
                            <strong>{a.nombre}</strong>
                            <span className="section-tag">{catActual?.nombre ?? "General"}</span>
                          </div>
                          <div className="manager-item-actions">
                            <button
                              type="button"
                              className="manager-btn icon-only"
                              title="Editar categoría"
                              aria-label={`Editar ${a.nombre}`}
                              onClick={() => {
                                setEditandoAsigId(a.id);
                                setBorradorAsig({
                                  nombre: a.nombre,
                                  color: a.color,
                                  categoriaId: categoriaPorAsignatura[a.id] ?? "general",
                                });
                              }}
                            >
                              <Icon name="pencil" size={14} />
                            </button>
                            <button
                              type="button"
                              className="manager-btn icon-only danger"
                              onClick={() => setABorrarAsig(a)}
                              title="Eliminar categoría"
                              aria-label={`Eliminar ${a.nombre}`}
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div className="manager-pane">
          <form className="manager-create-card" onSubmit={crearSeccion}>
            <div className="create-card-header">
              <div>
                <strong>Nueva sección</strong>
                <span>Agrupa tus categorías por bloques (ej. Trabajo, Personal, Clientes, Hogar…)</span>
              </div>
            </div>
            <div className="create-section-row">
              <input
                placeholder="Nombre de la nueva sección…"
                value={nombreNuevaSeccion}
                onChange={(e) => setNombreNuevaSeccion(e.target.value)}
              />
              <button type="submit" className="primary create-submit-btn" disabled={!nombreNuevaSeccion.trim()}>
                <Icon name="plus" size={15} />Crear sección
              </button>
            </div>
          </form>

          <div className="manager-list-block">
            <div className="manager-list-head">
              <strong>Secciones del menú lateral</strong>
              <span>Ordena con las flechas, edita con el lápiz</span>
            </div>

            <ul className="manager-items-list">
              {categorias.map((cat, idx) => {
                const itemsSeccion = asignaturas.filter((a) => (categoriaPorAsignatura[a.id] ?? "general") === cat.id);
                const editando = editandoSeccionId === cat.id;

                return (
                  <li key={cat.id} className={`manager-item-card section-card${editando ? " editing" : ""}`}>
                    {editando ? (
                      <div className="section-editor-row">
                        <input
                          value={nombreSeccionEdit}
                          onChange={(e) => setNombreSeccionEdit(e.target.value)}
                          placeholder="Nombre de la sección"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              guardarEdicionSeccion(cat.id);
                            }
                          }}
                        />
                        <button type="button" className="manager-btn ghost" onClick={() => setEditandoSeccionId(null)}>
                          Cancelar
                        </button>
                        <button type="button" className="manager-btn save" onClick={() => guardarEdicionSeccion(cat.id)}>
                          Guardar cambios
                        </button>
                      </div>
                    ) : (
                      <div className="section-card-body">
                        <div className="manager-item-row">
                          <div className="manager-item-info">
                            <strong>{cat.nombre}</strong>
                          </div>
                          <div className="manager-item-actions">
                            <button
                              type="button"
                              className="manager-btn icon-only"
                              disabled={idx === 0}
                              title="Subir sección"
                              aria-label={`Subir ${cat.nombre}`}
                              onClick={() => moverSeccion(idx, -1)}
                            >
                              <Icon name="chevron-up" size={14} />
                            </button>
                            <button
                              type="button"
                              className="manager-btn icon-only"
                              disabled={idx === categorias.length - 1}
                              title="Bajar sección"
                              aria-label={`Bajar ${cat.nombre}`}
                              onClick={() => moverSeccion(idx, 1)}
                            >
                              <Icon name="chevron-down" size={14} />
                            </button>
                            <span className="manager-actions-divider" aria-hidden="true" />
                            <button
                              type="button"
                              className="manager-btn icon-only"
                              title="Editar sección"
                              aria-label={`Editar ${cat.nombre}`}
                              onClick={() => {
                                setEditandoSeccionId(cat.id);
                                setNombreSeccionEdit(cat.nombre);
                              }}
                            >
                              <Icon name="pencil" size={14} />
                            </button>
                            <button
                              type="button"
                              className="manager-btn icon-only danger"
                              onClick={() => setSeccionABorrar(cat)}
                              disabled={cat.id === "general"}
                              title={cat.id === "general" ? "General no se puede eliminar" : "Eliminar sección"}
                              aria-label={`Eliminar sección ${cat.nombre}`}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </div>
                        </div>
                        {itemsSeccion.length > 0 && (
                          <div className="section-subjects-chips">
                            {itemsSeccion.map((m) => (
                              <span key={m.id} className="section-subject-chip">
                                <i style={{ background: m.color }} />
                                {m.nombre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {aBorrarAsig && (
        <div className="subject-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-subject-title">
          <div>
            <strong id="confirm-subject-title">¿Eliminar «{aBorrarAsig.nombre}»?</strong>
            <p>Las tareas existentes se conservarán en el calendario, pero quedarán sin categoría asignada.</p>
            <footer>
              <button type="button" className="manager-btn ghost" onClick={() => setABorrarAsig(null)}>Cancelar</button>
              <button type="button" className="manager-btn danger-solid" onClick={() => { void onRemove(aBorrarAsig.id); setABorrarAsig(null); }}>
                Eliminar categoría
              </button>
            </footer>
          </div>
        </div>
      )}

      {seccionABorrar && (
        <div className="subject-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-sec-title">
          <div>
            <strong id="confirm-sec-title">¿Eliminar la sección «{seccionABorrar.nombre}»?</strong>
            <p>Las categorías de esta sección no se borrarán: pasarán automáticamente a la sección General.</p>
            <footer>
              <button type="button" className="manager-btn ghost" onClick={() => setSeccionABorrar(null)}>Cancelar</button>
              <button type="button" className="manager-btn danger-solid" onClick={() => { onBorrarCategoria(seccionABorrar.id); setSeccionABorrar(null); }}>
                Eliminar sección
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
