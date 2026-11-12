import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { tipoLabel, type Asignatura, type ISODate, type NuevaTarea, type Tarea, type TareaEditable, type TipoTarea } from "../../../domain/entities";
import { tiposPersonalizados } from "../Tabs/Tabs";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import { colorVar } from "../../colors";
import { fromISO, monthGrid } from "../../../domain/dates";
import { segmentarTextoConEnlaces } from "../../../domain/links";
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

function TaskDatePicker({ value, onChange }: { value: ISODate; onChange: (fecha: ISODate) => void }) {
  const fecha = fromISO(value);
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => new Date(fecha.getFullYear(), fecha.getMonth(), 1));
  useEffect(() => setMes(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), [value]);
  const anterior = (): void => setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() - 1, 1));
  const siguiente = (): void => setMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + 1, 1));
  const elegir = (dia: ISODate): void => { onChange(dia); setAbierto(false); };
  const etiqueta = fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  return <div className="task-date-picker">
    <button type="button" className="task-date-trigger" onClick={() => setAbierto((v) => !v)} aria-label="Fecha" aria-expanded={abierto}><Icon name="calendar" size={15} /><span>{etiqueta}</span><Icon name="chevron-right" size={14} /></button>
    {abierto && <div className="task-date-popover" role="dialog" aria-label="Elegir fecha">
      <header><button type="button" aria-label="Mes anterior" onClick={anterior}><Icon name="chevron-left" size={15} /></button><strong>{mes.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</strong><button type="button" aria-label="Mes siguiente" onClick={siguiente}><Icon name="chevron-right" size={15} /></button></header>
      <div className="task-date-weekdays" aria-hidden="true">{["L", "M", "X", "J", "V", "S", "D"].map((dia) => <span key={dia}>{dia}</span>)}</div>
      <div className="task-date-days">{monthGrid(mes.getFullYear(), mes.getMonth()).map((dia, indice) => dia ? <button key={dia} type="button" className={dia === value ? "selected" : ""} onClick={() => elegir(dia)}>{Number(dia.slice(8))}</button> : <span key={`empty-${indice}`} />)}</div>
    </div>}
  </div>;
}

function TaskDescription({ texto }: { texto: string }) {
  const segmentos = segmentarTextoConEnlaces(texto);
  return (
    <p className="task-description">
      {segmentos.map((seg, indice) => {
        if (seg.tipo === "enlace" && seg.href) {
          return (
            <span key={indice}>
              <a
                className="task-link-pill"
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                title={seg.href}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="link" size={12} />
                <span>{seg.etiqueta ?? seg.valor}</span>
              </a>
              {seg.sufijo}
            </span>
          );
        }
        return <span key={indice}>{seg.valor}</span>;
      })}
    </p>
  );
}

export function DayPanel({ fecha, tareas, asignaturas, onAdd, onToggle, onUpdate, onRemove, asignaturaInicial = null }: Props) {
  const tipos = tiposPersonalizados();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<TipoTarea>(() => tipos[0]?.value ?? "ejercicio");
  const [asignaturaId, setAsignaturaId] = useState(asignaturaInicial ?? "");
  const [hora, setHora] = useState("");
  const [edicion, setEdicion] = useState<Tarea | null>(null);
  const [confirmarBorrado, setConfirmarBorrado] = useState<Tarea | null>(null);
  useEffect(() => setAsignaturaId(asignaturaInicial ?? ""), [asignaturaInicial, fecha]);
  const [horaSeleccionada = "", minutoSeleccionado = "00"] = hora.split(":");
  const cambiarHora = (nuevaHora: string): void => setHora(nuevaHora ? `${nuevaHora}:${minutoSeleccionado}` : "");
  const cambiarMinuto = (nuevoMinuto: string): void => setHora(horaSeleccionada ? `${horaSeleccionada}:${nuevoMinuto}` : "");
  const [horaEdicion = "", minutoEdicion = "00"] = (edicion?.hora ?? "").split(":");
  const cambiarHoraEdicion = (nuevaHora: string): void => setEdicion((actual) => actual ? { ...actual, hora: nuevaHora ? `${nuevaHora}:${minutoEdicion}` : null } : actual);
  const cambiarMinutoEdicion = (nuevoMinuto: string): void => setEdicion((actual) => actual && horaEdicion ? { ...actual, hora: `${horaEdicion}:${nuevoMinuto}` } : actual);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) return;
    const desc = descripcion.trim() || null;
    void onAdd({ titulo: t, descripcion: desc, tipo, fecha, hora: hora || null, asignaturaId: asignaturaId || null });
    setTitulo("");
    setDescripcion("");
  };
  const editar = (t: Tarea): void => setEdicion({ ...t });
  const guardarEdicion = (): void => {
    if (!edicion) return;
    const { id, hecha: _hecha, ...cambios } = edicion;
    if (!cambios.titulo.trim()) return;
    void onUpdate(id, { ...cambios, titulo: cambios.titulo.trim(), descripcion: cambios.descripcion?.trim() || null });
    setEdicion(null);
  };
  const fechaLarga = (valor: ISODate): string => fromISO(valor).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="day-panel">
      <p className="day-panel-intro">Organiza tus tareas, eventos y actividades para este día.</p>
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
                  <textarea
                    className="task-desc-input"
                    aria-label="Descripción o enlaces"
                    placeholder="Descripción o enlaces (ej. drive.google.com o figma.com)"
                    rows={2}
                    value={edicion.descripcion ?? ""}
                    onChange={(e) => setEdicion({ ...edicion, descripcion: e.target.value })}
                  />
                  <div className="task-edit-grid">
                    <div className="task-edit-schedule"><TaskDatePicker value={edicion.fecha} onChange={(nuevaFecha) => setEdicion({ ...edicion, fecha: nuevaFecha })} /><div className="task-edit-time"><select aria-label="Hora de la tarea" value={horaEdicion} onChange={(e) => cambiarHoraEdicion(e.target.value)}><option value="">Hora</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select><span>:</span><select aria-label="Minutos de la tarea" value={minutoEdicion} disabled={!horaEdicion} onChange={(e) => cambiarMinutoEdicion(e.target.value)}>{["00", "15", "30", "45"].map((valor) => <option key={valor} value={valor}>{valor}</option>)}</select></div></div>
                    <div className="task-edit-classification"><select aria-label="Tipo" value={edicion.tipo} onChange={(e) => setEdicion({ ...edicion, tipo: e.target.value as TipoTarea })}>{tipos.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select><select aria-label="Categoría" value={edicion.asignaturaId ?? ""} onChange={(e) => setEdicion({ ...edicion, asignaturaId: e.target.value || null })}><option value="">Sin categoría</option>{asignaturas.map((asignatura) => <option key={asignatura.id} value={asignatura.id}>{asignatura.nombre}</option>)}</select></div>
                  </div>
                  <div className="task-edit-actions"><button type="button" className="task-action" onClick={() => setEdicion(null)}>Cancelar</button><button type="button" className="task-action save" onClick={guardarEdicion}>Guardar cambios</button></div>
                </div>
              ) : <>
                <div className="body">
                  <span className="titulo">{t.titulo}</span>
                  {t.descripcion && <TaskDescription texto={t.descripcion} />}
                  <span className="task-meta"><span><Icon name="calendar" size={14} />{fechaLarga(t.fecha)}</span>{t.hora && <span><Icon name="clock" size={14} />{t.hora.slice(0, 5)}</span>}</span>
                  <span className="chips">
                    <span className={`chip tipo-${t.tipo}`} style={{ "--task-tag": tipos.find((opcion) => opcion.value === t.tipo)?.color ?? "#98a2b3" } as CSSProperties}>{tipos.find((opcion) => opcion.value === t.tipo)?.label ?? tipoLabel(t.tipo)}</span>
                    {a && <span className="chip"><i className="dot" style={{ background: a.color }} />{a.nombre}</span>}
                    {!t.hecha && <span className="when2">{describeDays(t.fecha)}</span>}
                  </span>
                </div>
                <div className="task-card-actions"><button className="task-action edit" onClick={() => editar(t)}><Icon name="pencil" size={14} />Editar</button><button className="task-action remove" onClick={() => setConfirmarBorrado(t)}><Icon name="trash" size={14} />Eliminar</button></div>
              </>}
            </li>
          );
        })}
      </ul>
      {!edicion && <form className="add" onSubmit={submit}>
        <input placeholder="¿Qué hay que hacer?" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea
          className="task-desc-input"
          aria-label="Descripción o enlaces"
          placeholder="Descripción o enlaces (ej. drive.google.com, figma.com…)"
          rows={2}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <div className="row">
          <div className="time-selects" aria-label="Hora opcional"><select className="native-select" value={horaSeleccionada} onChange={(e) => cambiarHora(e.target.value)} aria-label="Hora"><option value="">Hora</option>{Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}</select><span>:</span><select className="native-select" value={minutoSeleccionado} onChange={(e) => cambiarMinuto(e.target.value)} disabled={!horaSeleccionada} aria-label="Minutos">{["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
          <select className="native-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoTarea)} aria-label="Tipo">
            {tipos.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select className="native-select" value={asignaturaId} onChange={(e) => setAsignaturaId(e.target.value)} aria-label="Categoría">
            <option value="">Sin categoría</option>
            {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </div>
        <button type="submit" className="primary">Añadir tarea</button>
      </form>}
      {confirmarBorrado && <div className="confirm-delete" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><div className="confirm-delete-card"><h3 id="delete-title">¿Eliminar tarea?</h3><p>Vas a eliminar “{confirmarBorrado.titulo}”. Esta acción no se puede deshacer.</p><div><button type="button" className="task-action" onClick={() => setConfirmarBorrado(null)}>Cancelar</button><button type="button" className="task-action remove" onClick={() => { void onRemove(confirmarBorrado.id); setConfirmarBorrado(null); }}>Eliminar tarea</button></div></div></div>}
    </div>
  );
}
