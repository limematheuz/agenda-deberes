import { useEffect, useState, type FormEvent } from "react";
import { TIPOS, tipoLabel, type Asignatura, type ISODate, type NuevaTarea, type Tarea, type TareaEditable, type TipoTarea } from "../../../domain/entities";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import { colorVar } from "../../colors";
import { fromISO } from "../../../domain/dates";
import { Icon } from "../Icon/Icon";
import "../../styles/list.css";
import "./DayPanel.css";

interface Props {
  fecha: ISODate;
  tareas: readonly Tarea[];
  asignaturas: readonly Asignatura[];
  onAdd: (n: NuevaTarea) => Promise<void>;
  onToggle: (t: Tarea) => Promise<void>;
  onUpdate: (id: string, cambios: TareaEditable) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  asignaturaInicial?: string | null;
}

export function DayPanel({ fecha, tareas, asignaturas, onAdd, onToggle, onUpdate, onRemove, asignaturaInicial = null }: Props) {
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<TipoTarea>("ejercicio");
  const [asignaturaId, setAsignaturaId] = useState(asignaturaInicial ?? "");
  const [hora, setHora] = useState("");
  const [edicion, setEdicion] = useState<Tarea | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState<Tarea | null>(null);
  useEffect(() => setAsignaturaId(asignaturaInicial ?? ""), [asignaturaInicial, fecha]);
  const [horaSeleccionada = "", minutoSeleccionado = "00"] = hora.split(":");
  const cambiarHora = (nuevaHora: string): void => setHora(nuevaHora ? `${nuevaHora}:${minutoSeleccionado}` : "");
  const cambiarMinuto = (nuevoMinuto: string): void => setHora(horaSeleccionada ? `${horaSeleccionada}:${nuevoMinuto}` : "");

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) return;
    void onAdd({ titulo: t, tipo, fecha, hora: hora || null, asignaturaId: asignaturaId || null });
    setTitulo("");
  };
  const editar = (t: Tarea): void => setEdicion({ ...t });
  const guardarEdicion = (): void => {
    if (!edicion) return;
    const { id, hecha: _hecha, ...cambios } = edicion;
    if (!cambios.titulo.trim()) return;
    void onUpdate(id, { ...cambios, titulo: cambios.titulo.trim() });
    setEdicion(null);
  };
  const fechaLarga = (valor: ISODate): string => fromISO(valor).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="day-panel">
      <ul className="list">
        {tareas.length === 0 && <li className="muted">Nada apuntado para este día.</li>}
        {tareas.map((t) => {
          const a = asignaturas.find((x) => x.id === t.asignaturaId);
          const editando = edicion?.id === t.id;
          return (
            <li key={t.id} className={`item task-detail u-${urgencyOf(t)}${t.hecha ? " done" : ""}${editando ? " editing" : ""}`} style={colorVar(a?.color)}>
              <input type="checkbox" checked={t.hecha} aria-label="Marcar como hecho" onChange={() => void onToggle(t)} />
              {editando && edicion ? (
                <div className="task-edit body">
                  <input aria-label="Título" value={edicion.titulo} onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })} autoFocus />
                  <div className="task-edit-grid">
                    <input type="date" aria-label="Fecha" value={edicion.fecha} onChange={(e) => setEdicion({ ...edicion, fecha: e.target.value })} />
                    <select aria-label="Tipo" value={edicion.tipo} onChange={(e) => setEdicion({ ...edicion, tipo: e.target.value as TipoTarea })}>{TIPOS.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select>
                    <select aria-label="Asignatura" value={edicion.asignaturaId ?? ""} onChange={(e) => setEdicion({ ...edicion, asignaturaId: e.target.value || null })}><option value="">Sin asignatura</option>{asignaturas.map((asignatura) => <option key={asignatura.id} value={asignatura.id}>{asignatura.nombre}</option>)}</select>
                  </div>
                  <div className="task-edit-actions"><button type="button" className="task-action" onClick={() => setEdicion(null)}>Cancelar</button><button type="button" className="task-action save" onClick={guardarEdicion}>Guardar cambios</button></div>
                </div>
              ) : <>
                <div className="body">
                  <span className="titulo">{t.titulo}</span>
                  <span className="task-meta"><span><Icon name="calendar" size={14} />{fechaLarga(t.fecha)}</span>{t.hora && <span><Icon name="clock" size={14} />{t.hora.slice(0, 5)}</span>}</span>
                  <span className="chips">
                    <span className={`chip tipo-${t.tipo}`}>{tipoLabel(t.tipo)}</span>
                    {a && <span className="chip"><i className="dot" style={{ background: a.color }} />{a.nombre}</span>}
                    {!t.hecha && <span className="when2">{describeDays(t.fecha)}</span>}
                  </span>
                </div>
                <div className="task-card-actions"><button className="task-action edit" onClick={() => editar(t)}><Icon name="pencil" size={14} />Editar</button><button className="task-action remove" onClick={() => setConfirmarBorrado(t)}><Icon name="trash" size={14} />Borrar</button></div>
              </>}
            </li>
          );
        })}
      </ul>
      <form className="add" onSubmit={submit}>
        <input placeholder="¿Qué hay que hacer?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <div className="row">
          <div className="time-selects" aria-label="Hora opcional"><select className="native-select" value={horaSeleccionada} onChange={(e) => cambiarHora(e.target.value)} aria-label="Hora"><option value="">Hora</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}</select><span>:</span><select className="native-select" value={minutoSeleccionado} onChange={(e) => cambiarMinuto(e.target.value)} disabled={!horaSeleccionada} aria-label="Minutos">{["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          <select className="native-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTarea)} aria-label="Tipo">
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="native-select" value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)} aria-label="Asignatura">
            <option value="">Sin asignatura</option>
            {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <button type="submit" className="primary">Añadir deber</button>
      </form>
      {confirmarBorrado && <div className="confirm-delete" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-delete-card"><h3 id="delete-title">¿Eliminar deber?</h3><p>Vas a borrar “{confirmarBorrado.titulo}”. Esta acción no se puede deshacer.</p><div><button type="button" className="task-action" onClick={() => setConfirmarBorrado(null)}>Cancelar</button><button type="button" className="task-action remove" onClick={() => { void onRemove(confirmarBorrado.id); setConfirmarBorrado(null); }}>Eliminar deber</button></div></div></div>}
    </div>
  );
}
