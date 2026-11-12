import { useEffect, useState, type FormEvent } from "react";
import type { Asignatura } from "../../../domain/entities";
import { Dialog } from "../Dialog/Dialog";
import { Icon } from "../Icon/Icon";
import type { CategoryItem } from "./SubjectsManager";
import "./SubjectsManager.css";

export interface SectionsModalProps {
  abierto: boolean;
  onCerrar: () => void;
  categorias: readonly CategoryItem[];
  asignaturas?: readonly Asignatura[];
  categoriaPorAsignatura?: Readonly<Record<string, string>>;
  onCrearCategoria: (nombre: string) => string;
  onRenombrarCategoria: (id: string, nombre: string) => void;
  onBorrarCategoria: (id: string) => void;
  onReorderCategorias: (origen: string, destino: string) => void;
  editarSeccionId?: string | null;
}

export function SectionsModal({
  abierto,
  onCerrar,
  categorias,
  asignaturas: _asignaturas,
  categoriaPorAsignatura: _categoriaPorAsignatura,
  onCrearCategoria,
  onRenombrarCategoria,
  onBorrarCategoria,
  onReorderCategorias,
  editarSeccionId = null,
}: SectionsModalProps) {
  const [nombreNueva, setNombreNueva] = useState("");
  const [seccionEditandoId, setSeccionEditandoId] = useState<string | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [seccionABorrar, setSeccionABorrar] = useState<CategoryItem | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setNombreNueva("");
    setSeccionABorrar(null);
    if (editarSeccionId) {
      const encontrada = categorias.find((c) => c.id === editarSeccionId);
      if (encontrada) {
        setSeccionEditandoId(encontrada.id);
        setNombreEdit(encontrada.nombre);
        return;
      }
    }
    setSeccionEditandoId(null);
    setNombreEdit("");
  }, [abierto, editarSeccionId, categorias]);

  const crear = (e: FormEvent): void => {
    e.preventDefault();
    const limpio = nombreNueva.trim();
    if (!limpio) return;
    onCrearCategoria(limpio);
    setNombreNueva("");
  };

  const guardarEdicion = (id: string): void => {
    const limpio = nombreEdit.trim();
    if (limpio) {
      onRenombrarCategoria(id, limpio);
    }
    setSeccionEditandoId(null);
    setNombreEdit("");
  };

  const mover = (index: number, direccion: -1 | 1): void => {
    const destino = index + direccion;
    if (destino < 0 || destino >= categorias.length) return;
    onReorderCategorias(categorias[index].id, categorias[destino].id);
  };

  const confirmarBorrado = (): void => {
    if (!seccionABorrar) return;
    onBorrarCategoria(seccionABorrar.id);
    setSeccionABorrar(null);
  };

  return (
    <Dialog abierto={abierto} titulo="Gestionar secciones" onCerrar={onCerrar}>
      <div className="independent-manager">
        <p className="independent-subtitle">
          Las secciones te permiten agrupar categorías en bloques dentro de la barra lateral (ej. Trabajo, Proyectos, Hogar).
        </p>

        {/* Formulario de creación de sección */}
        <form className="friendly-section-create-card" onSubmit={crear}>
          <label className="friendly-field">
            <span className="friendly-field-label">Nueva sección</span>
            <div className="friendly-section-input-row">
              <input
                className="friendly-text-input"
                placeholder="Ej. Proyectos 2026, Clientes, Rutinas…"
                value={nombreNueva}
                onChange={(e) => setNombreNueva(e.target.value)}
              />
              <button type="submit" className="primary" disabled={!nombreNueva.trim()}>
                <Icon name="plus" size={14} />
                <span>Crear sección</span>
              </button>
            </div>
          </label>
        </form>

        {/* Lista de secciones existentes */}
        <div className="friendly-list-block">
          <div className="friendly-list-header">
            <strong>Tus secciones ({categorias.length})</strong>
            <span>Usa las flechas para ordenar y el lápiz para renombrar</span>
          </div>

          <ul className="friendly-cards-list">
            {categorias.map((cat, idx) => {
              const nombreVisible = cat.nombre?.trim() || (cat as any).name?.trim() || (cat.id === "general" ? "General" : "Sección");
              const esEditando = seccionEditandoId === cat.id;

              return (
                <li key={cat.id} className="friendly-card-item section-item">
                  {esEditando ? (
                    <div className="friendly-section-inline-edit">
                      <input
                        className="friendly-text-input"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                        placeholder="Nombre de la sección"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            guardarEdicion(cat.id);
                          } else if (e.key === "Escape") {
                            setSeccionEditandoId(null);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setSeccionEditandoId(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => guardarEdicion(cat.id)}
                        disabled={!nombreEdit.trim()}
                      >
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="friendly-card-left">
                        <Icon name="menu" size={15} />
                        <strong className="friendly-section-title">{nombreVisible}</strong>
                      </div>
                      <div className="friendly-card-actions">
                        <button
                          type="button"
                          className="manager-btn icon-only"
                          title="Subir"
                          aria-label={`Mover ${nombreVisible} arriba`}
                          disabled={idx === 0}
                          onClick={() => mover(idx, -1)}
                        >
                          <Icon name="chevron-up" size={13} />
                        </button>
                        <button
                          type="button"
                          className="manager-btn icon-only"
                          title="Bajar"
                          aria-label={`Mover ${nombreVisible} abajo`}
                          disabled={idx === categorias.length - 1}
                          onClick={() => mover(idx, 1)}
                        >
                          <Icon name="chevron-down" size={13} />
                        </button>
                        <button
                          type="button"
                          className="manager-btn icon-only"
                          title="Renombrar sección"
                          aria-label={`Renombrar ${nombreVisible}`}
                          onClick={() => {
                            setSeccionEditandoId(cat.id);
                            setNombreEdit(nombreVisible);
                          }}
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                        {cat.id !== "general" ? (
                          <button
                            type="button"
                            className="manager-btn icon-only danger"
                            title="Eliminar sección"
                            aria-label={`Eliminar ${nombreVisible}`}
                            onClick={() => setSeccionABorrar(cat)}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        ) : (
                          <span className="manager-btn-placeholder" title="La sección General no se puede eliminar" />
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Diálogo de confirmación para eliminar sección */}
        {seccionABorrar && (
          <div className="friendly-confirm-overlay">
            <div className="friendly-confirm-card">
              <h4>¿Eliminar la sección "{seccionABorrar.nombre}"?</h4>
              <p>
                Sus categorías no se perderán: se moverán automáticamente a la sección <strong>General</strong>.
              </p>
              <div className="friendly-confirm-actions">
                <button type="button" className="secondary" onClick={() => setSeccionABorrar(null)}>
                  Cancelar
                </button>
                <button type="button" className="primary danger" onClick={confirmarBorrado}>
                  Sí, eliminar sección
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
