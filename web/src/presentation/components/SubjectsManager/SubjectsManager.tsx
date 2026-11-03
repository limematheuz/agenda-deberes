import { useState, type CSSProperties, type FormEvent } from "react";
import type { Asignatura, NuevaAsignatura } from "../../../domain/entities";
import "../../styles/list.css";
import "./SubjectsManager.css";

interface Props {
  asignaturas: readonly Asignatura[];
  onAdd: (n: NuevaAsignatura) => Promise<void>;
  onUpdate: (id: string, cambios: Pick<Asignatura, "nombre" | "color">) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  categorias: readonly { id: string; nombre: string }[];
  categoriaPorAsignatura: Readonly<Record<string, string>>;
  onAsignarCategoria: (asignaturaId: string, categoriaId: string) => void;
}

function SubjectColorSwatch({ color, onChange, label = "Color" }: { color: string; onChange: (color: string) => void; label?: string }) {
  return <label className="subject-color-swatch" title={label}><input type="color" value={color} onChange={(e) => onChange(e.target.value)} aria-label={label} /><span style={{ background: color }} /></label>;
}

export function SubjectsManager({ asignaturas, onAdd, onUpdate, onRemove, categorias, categoriaPorAsignatura, onAsignarCategoria }: Props) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#2e90fa");
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<{ nombre: string; color: string } | null>(null);
  const [aBorrar, setABorrar] = useState<Asignatura | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    void onAdd({ nombre: n, color });
    setNombre("");
    setMostrarFormulario(false);
  };

  return (
    <div className="subjects-manager">
      <p className="subjects-lead">Gestiona nombre, color y categoría de cada asignatura.</p>
      <ul className="list subjects-list">
        {asignaturas.length === 0 && <li className="muted">Aún no hay asignaturas. Añade la primera abajo.</li>}
        {asignaturas.map((a) => (
          <li key={a.id} className="item subject-row" style={{ "--subject-color": a.color } as CSSProperties}>
            <i className="dot" style={{ background: a.color }} />
            {editando === a.id && borrador ? <span className="body subject-edit"><input value={borrador.nombre} onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} /><SubjectColorSwatch color={borrador.color} onChange={(color) => setBorrador({ ...borrador, color })} label={`Color para ${a.nombre}`} /></span> : <span className="body subject-name">{a.nombre}<small>{categorias.find((categoria) => categoria.id === (categoriaPorAsignatura[a.id] ?? "general"))?.nombre ?? "General"}</small></span>}
            <select value={categoriaPorAsignatura[a.id] ?? "general"} onChange={(e) => onAsignarCategoria(a.id, e.target.value)} aria-label={`Categoría de ${a.nombre}`}>{categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}</select>
            <div className="subject-actions">{editando === a.id ? <button className="subject-save" onClick={() => { if (borrador?.nombre.trim()) void onUpdate(a.id, { nombre: borrador.nombre.trim(), color: borrador.color }); setEditando(null); }}>Guardar</button> : <button className="subject-edit-button" onClick={() => { setEditando(a.id); setBorrador({ nombre: a.nombre, color: a.color }); }}>Editar</button>}<button className="subject-delete" onClick={() => setABorrar(a)}>Borrar</button></div>
          </li>
        ))}
      </ul>
      {mostrarFormulario ? <div className="subjects-forms"><form className="add row subject-form" onSubmit={submit}>
        <span className="subject-form-title">Crear materia</span>
        <input placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <SubjectColorSwatch color={color} onChange={setColor} />
        <button type="submit" className="primary">Añadir</button>
      </form><button className="subject-edit-button cancel-add" onClick={() => { setMostrarFormulario(false); setNombre(""); }}>Cancelar</button></div> : <button className="add-subject-button" onClick={() => setMostrarFormulario(true)}><span>+</span> Añadir asignatura</button>}
      {aBorrar && <div className="subject-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-subject-title"><div><strong id="confirm-subject-title">¿Borrar {aBorrar.nombre}?</strong><p>Las tareas existentes se conservarán, pero quedarán sin asignatura.</p><footer><button className="subject-edit-button" onClick={() => setABorrar(null)}>Cancelar</button><button className="subject-delete" onClick={() => { void onRemove(aBorrar.id); setABorrar(null); }}>Borrar asignatura</button></footer></div></div>}
    </div>
  );
}
