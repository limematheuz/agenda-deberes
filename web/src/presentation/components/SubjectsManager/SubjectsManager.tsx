import { useState, type FormEvent } from "react";
import type { Asignatura, NuevaAsignatura } from "../../../domain/entities";
import "../../styles/list.css";

interface Props {
  asignaturas: readonly Asignatura[];
  onAdd: (n: NuevaAsignatura) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function SubjectsManager({ asignaturas, onAdd, onRemove }: Props) {
  const [nombre, setNombre] = useState("");
  const [color, setColor] = useState("#2e90fa");

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    void onAdd({ nombre: n, color });
    setNombre("");
  };

  return (
    <div>
      <ul className="list">
        {asignaturas.length === 0 && <li className="muted">Aún no hay asignaturas. Añade la primera abajo.</li>}
        {asignaturas.map((a) => (
          <li key={a.id} className="item">
            <i className="dot" style={{ background: a.color }} />
            <span className="body">{a.nombre}</span>
            <button className="ghost" onClick={() => void onRemove(a.id)}>Borrar</button>
          </li>
        ))}
      </ul>
      <form className="add row" onSubmit={submit}>
        <input placeholder="Nueva asignatura" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color" />
        <button type="submit" className="primary">Añadir</button>
      </form>
    </div>
  );
}
