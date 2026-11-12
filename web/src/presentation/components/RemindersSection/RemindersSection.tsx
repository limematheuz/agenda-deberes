import { useState, type CSSProperties, type FormEvent } from "react";
import { addDays, fromISO, todayISO } from "../../../domain/dates";
import type { ISODate, ItemChecklist, NotaBloc, Recordatorio } from "../../../domain/entities";
import { contieneEnlace, segmentarTextoConEnlaces } from "../../../domain/links";
import { describeDays } from "../../../domain/urgency";
import { ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Icon } from "../Icon/Icon";
import "./RemindersSection.css";

function TextoConEnlaces({ texto }: { texto: string }) {
  const segmentos = segmentarTextoConEnlaces(texto);
  return (
    <p className="reminder-note-text">
      {segmentos.map((seg, i) => {
        if (seg.tipo === "enlace" && seg.href) {
          return (
            <span key={i}>
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
        return <span key={i}>{seg.valor}</span>;
      })}
    </p>
  );
}

interface RemindersProps {
  recordatorios: readonly Recordatorio[];
  onCrearRecordatorio: (nuevo: Omit<Recordatorio, "id" | "creadoEn" | "hecho">) => void;
  onActualizarRecordatorio: (id: string, cambios: Partial<Omit<Recordatorio, "id" | "creadoEn">>) => void;
  onBorrarRecordatorio: (id: string) => void;
}

export function RemindersSection({
  recordatorios,
  onCrearRecordatorio,
  onActualizarRecordatorio,
  onBorrarRecordatorio,
}: RemindersProps) {
  const hoy = todayISO();

  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  const [fechaAviso, setFechaAviso] = useState<ISODate>(hoy);
  const [sinFecha, setSinFecha] = useState(false);
  const [horaAviso, setHoraAviso] = useState("09:00");
  const [conHora, setConHora] = useState(true);
  const [itemsNuevo, setItemsNuevo] = useState<ItemChecklist[]>([]);
  const [textoCheckNuevo, setTextoCheckNuevo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edicion, setEdicion] = useState<Recordatorio | null>(null);
  const [nuevoItemEnTarjeta, setNuevoItemEnTarjeta] = useState<Record<string, string>>({});

  const anadirCheckAlFormulario = (): void => {
    const limpio = textoCheckNuevo.trim();
    if (!limpio) return;
    setItemsNuevo((actual) => [...actual, { id: `chk-${Date.now()}-${actual.length}`, texto: limpio, hecho: false }]);
    setTextoCheckNuevo("");
  };

  const crearRecordatorio = (e: FormEvent): void => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) return;
    const pendientes = textoCheckNuevo.trim()
      ? [...itemsNuevo, { id: `chk-${Date.now()}`, texto: textoCheckNuevo.trim(), hecho: false }]
      : itemsNuevo;
    onCrearRecordatorio({
      titulo: t,
      nota: nota.trim(),
      items: pendientes,
      fechaAviso: sinFecha ? null : fechaAviso,
      horaAviso: !sinFecha && conHora && horaAviso ? horaAviso : null,
    });
    setTitulo("");
    setNota("");
    setItemsNuevo([]);
    setTextoCheckNuevo("");
  };

  const iniciarEdicion = (r: Recordatorio): void => {
    setEditandoId(r.id);
    setEdicion({ ...r, items: r.items.map((i) => ({ ...i })) });
  };

  const guardarEdicion = (): void => {
    if (!edicion || !edicion.titulo.trim()) return;
    onActualizarRecordatorio(edicion.id, {
      titulo: edicion.titulo.trim(),
      nota: edicion.nota.trim(),
      items: edicion.items.filter((i) => i.texto.trim().length > 0),
      fechaAviso: edicion.fechaAviso,
      horaAviso: edicion.fechaAviso ? edicion.horaAviso : null,
    });
    setEditandoId(null);
    setEdicion(null);
  };

  const toggleItemTarjeta = (r: Recordatorio, itemId: string): void => {
    const nuevosItems = r.items.map((item) => item.id === itemId ? { ...item, hecho: !item.hecho } : item);
    onActualizarRecordatorio(r.id, { items: nuevosItems });
  };

  const editarTextoItemTarjeta = (r: Recordatorio, itemId: string, texto: string): void => {
    const nuevosItems = r.items.map((item) => item.id === itemId ? { ...item, texto } : item);
    onActualizarRecordatorio(r.id, { items: nuevosItems });
  };

  const quitarItemTarjeta = (r: Recordatorio, itemId: string): void => {
    onActualizarRecordatorio(r.id, { items: r.items.filter((i) => i.id !== itemId) });
  };

  const anadirItemRapidoTarjeta = (r: Recordatorio): void => {
    const txt = (nuevoItemEnTarjeta[r.id] ?? "").trim();
    if (!txt) return;
    onActualizarRecordatorio(r.id, {
      items: [...r.items, { id: `chk-${Date.now()}`, texto: txt, hecho: false }],
    });
    setNuevoItemEnTarjeta((actual) => ({ ...actual, [r.id]: "" }));
  };

  const pendientes = [...recordatorios]
    .filter((r) => !r.hecho)
    .sort((a, b) => (a.fechaAviso ?? "9999-99-99").localeCompare(b.fechaAviso ?? "9999-99-99"));
  const completados = recordatorios.filter((r) => r.hecho);

  const formatoFechaCorta = (iso: ISODate): string =>
    fromISO(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  return (
    <section className="reminders-only-workspace" aria-label="Recordatorios">
      <div className="reminders-column">
        <form className="reminder-composer" onSubmit={crearRecordatorio}>
          <div className="composer-head">
            <strong>Nuevo recordatorio</strong>
            <span>Con fecha de aviso y lista de casillas (checkboxes)</span>
          </div>
          <input
            className="composer-title-input"
            placeholder="¿Qué necesitas recordar? (ej. Enviar presupuesto o confirmar cita)"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <textarea
            className="task-desc-input"
            rows={2}
            placeholder="Notas o enlaces sin necesidad de https (ej. drive.google.com, figma.com)"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />

          <div className="composer-checklist">
            <span className="composer-sublabel">Casillas de verificación (opcional)</span>
            {itemsNuevo.length > 0 && (
              <ul className="checklist-items-editor">
                {itemsNuevo.map((item) => (
                  <li key={item.id}>
                    <input
                      type="checkbox"
                      checked={item.hecho}
                      onChange={() => setItemsNuevo((actual) => actual.map((x) => x.id === item.id ? { ...x, hecho: !x.hecho } : x))}
                    />
                    <input
                      type="text"
                      value={item.texto}
                      onChange={(e) => setItemsNuevo((actual) => actual.map((x) => x.id === item.id ? { ...x, texto: e.target.value } : x))}
                    />
                    <button
                      type="button"
                      className="checklist-remove-btn"
                      aria-label="Quitar casilla"
                      onClick={() => setItemsNuevo((actual) => actual.filter((x) => x.id !== item.id))}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="checklist-add-row">
              <input
                type="text"
                placeholder="+ Añadir casilla a la lista (pulsa Enter o +)"
                value={textoCheckNuevo}
                onChange={(e) => setTextoCheckNuevo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    anadirCheckAlFormulario();
                  }
                }}
              />
              <button type="button" className="secondary" onClick={anadirCheckAlFormulario}>+ Casilla</button>
            </div>
          </div>

          <div className="composer-schedule-bar">
            <div className="schedule-quick-chips">
              <button
                type="button"
                className={!sinFecha && fechaAviso === hoy ? "on" : ""}
                onClick={() => { setSinFecha(false); setFechaAviso(hoy); }}
              >
                Hoy
              </button>
              <button
                type="button"
                className={!sinFecha && fechaAviso === addDays(hoy, 1) ? "on" : ""}
                onClick={() => { setSinFecha(false); setFechaAviso(addDays(hoy, 1)); }}
              >
                Mañana
              </button>
              <button
                type="button"
                className={!sinFecha && fechaAviso === addDays(hoy, 7) ? "on" : ""}
                onClick={() => { setSinFecha(false); setFechaAviso(addDays(hoy, 7)); }}
              >
                En 1 semana
              </button>
              <button
                type="button"
                className={sinFecha ? "on" : ""}
                onClick={() => setSinFecha((v) => !v)}
              >
                Sin fecha
              </button>
            </div>

            {!sinFecha && (
              <div className="schedule-datetime-inputs">
                <label className="reminder-date-field">
                  <Icon name="bell" size={14} />
                  <span>Aviso:</span>
                  <input type="date" value={fechaAviso} onChange={(e) => setFechaAviso(e.target.value)} aria-label="Fecha de aviso" />
                </label>
                <label className="reminder-time-toggle">
                  <input type="checkbox" checked={conHora} onChange={(e) => setConHora(e.target.checked)} />
                  <span>Hora</span>
                </label>
                {conHora && (
                  <input
                    type="time"
                    className="reminder-time-input"
                    value={horaAviso}
                    onChange={(e) => setHoraAviso(e.target.value)}
                    aria-label="Hora de aviso"
                  />
                )}
              </div>
            )}

            <button type="submit" className="primary reminder-submit-btn">
              <Icon name="plus" size={16} />Guardar recordatorio
            </button>
          </div>
        </form>

        <div className="reminders-list-section">
          <div className="section-header-inline">
            <h2>Recordatorios activos</h2>
            <span className="pill-counter">{pendientes.length}</span>
          </div>

          {pendientes.length === 0 && <p className="muted">No tienes recordatorios pendientes.</p>}

          <ul className="reminders-cards">
            {pendientes.map((r) => {
              const esEditando = editandoId === r.id && edicion !== null;
              const vencidoOHoy = Boolean(r.fechaAviso && r.fechaAviso <= hoy);
              const hechosCount = r.items.filter((i) => i.hecho).length;

              return (
                <li key={r.id} className={`reminder-card${vencidoOHoy ? " due-soon" : ""}`}>
                  <input
                    type="checkbox"
                    className="reminder-main-check"
                    checked={r.hecho}
                    aria-label={`Completar recordatorio ${r.titulo}`}
                    onChange={() => onActualizarRecordatorio(r.id, { hecho: !r.hecho })}
                  />

                  {esEditando && edicion ? (
                    <div className="reminder-edit-body">
                      <input
                        aria-label="Título del recordatorio"
                        value={edicion.titulo}
                        onChange={(e) => setEdicion({ ...edicion, titulo: e.target.value })}
                        autoFocus
                      />
                      <textarea
                        className="task-desc-input"
                        rows={2}
                        placeholder="Nota o enlaces (ej. drive.google.com)"
                        value={edicion.nota}
                        onChange={(e) => setEdicion({ ...edicion, nota: e.target.value })}
                      />
                      <div className="reminder-edit-datetime">
                        <label>
                          <span>Fecha de aviso</span>
                          <input
                            type="date"
                            value={edicion.fechaAviso ?? ""}
                            onChange={(e) => setEdicion({ ...edicion, fechaAviso: e.target.value || null })}
                          />
                        </label>
                        <label>
                          <span>Hora de aviso</span>
                          <input
                            type="time"
                            value={edicion.horaAviso ?? ""}
                            disabled={!edicion.fechaAviso}
                            onChange={(e) => setEdicion({ ...edicion, horaAviso: e.target.value || null })}
                          />
                        </label>
                      </div>
                      <div className="reminder-edit-actions">
                        <button type="button" className="task-action" onClick={() => { setEditandoId(null); setEdicion(null); }}>Cancelar</button>
                        <button type="button" className="task-action save" onClick={guardarEdicion}>Guardar cambios</button>
                      </div>
                    </div>
                  ) : (
                    <div className="reminder-body">
                      <div className="reminder-top-row">
                        <strong className="reminder-title">{r.titulo}</strong>
                        <div className="reminder-actions">
                          <button type="button" className="task-action edit" onClick={() => iniciarEdicion(r)}>
                            <Icon name="pencil" size={13} />Editar
                          </button>
                          <button type="button" className="task-action remove" onClick={() => onBorrarRecordatorio(r.id)} aria-label="Borrar recordatorio">
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </div>

                      {r.nota && <TextoConEnlaces texto={r.nota} />}

                      <div className="reminder-live-checklist">
                        {r.items.length > 0 && (
                          <ul className="live-checklist-ul">
                            {r.items.map((item) => (
                              <li key={item.id} className={item.hecho ? "checked" : ""}>
                                <input
                                  type="checkbox"
                                  checked={item.hecho}
                                  onChange={() => toggleItemTarjeta(r, item.id)}
                                />
                                <input
                                  type="text"
                                  className="inline-check-input"
                                  value={item.texto}
                                  onChange={(e) => editarTextoItemTarjeta(r, item.id, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="inline-check-del"
                                  aria-label="Eliminar casilla"
                                  onClick={() => quitarItemTarjeta(r, item.id)}
                                >
                                  <Icon name="x" size={12} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="inline-add-check">
                          <input
                            type="text"
                            placeholder="+ Añadir casilla…"
                            value={nuevoItemEnTarjeta[r.id] ?? ""}
                            onChange={(e) => setNuevoItemEnTarjeta((actual) => ({ ...actual, [r.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                anadirItemRapidoTarjeta(r);
                              }
                            }}
                          />
                          {(nuevoItemEnTarjeta[r.id] ?? "").trim() && (
                            <button type="button" onClick={() => anadirItemRapidoTarjeta(r)}>Añadir</button>
                          )}
                        </div>
                      </div>

                      <div className="reminder-badges">
                        {r.fechaAviso ? (
                          <span className={`reminder-alert-badge${vencidoOHoy ? " urgent" : ""}`}>
                            <Icon name="bell" size={12} />
                            <span>{describeDays(r.fechaAviso)} ({formatoFechaCorta(r.fechaAviso)}{r.horaAviso ? ` · ${r.horaAviso}` : ""})</span>
                          </span>
                        ) : (
                          <span className="reminder-alert-badge muted-badge">Sin fecha de aviso</span>
                        )}
                        {r.items.length > 0 && (
                          <span className="reminder-progress-badge">
                            ✓ {hechosCount}/{r.items.length} casillas
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {completados.length > 0 && (
            <details className="reminders-completed-group">
              <summary>Completados ({completados.length})</summary>
              <ul className="reminders-cards completed-list">
                {completados.map((r) => (
                  <li key={r.id} className="reminder-card done">
                    <input
                      type="checkbox"
                      className="reminder-main-check"
                      checked={r.hecho}
                      onChange={() => onActualizarRecordatorio(r.id, { hecho: false })}
                    />
                    <div className="reminder-body">
                      <div className="reminder-top-row">
                        <strong className="reminder-title">{r.titulo}</strong>
                        <button type="button" className="task-action remove" onClick={() => onBorrarRecordatorio(r.id)}>
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
    </section>
  );
}

interface NotesProps {
  notas: readonly NotaBloc[];
  onCrearNota: (colorInicial?: string) => string;
  onActualizarNota: (id: string, cambios: Partial<Omit<NotaBloc, "id">>) => void;
  onBorrarNota: (id: string) => void;
}

export function NotesSection({ notas, onCrearNota, onActualizarNota, onBorrarNota }: NotesProps) {
  const [notaAbiertaId, setNotaAbiertaId] = useState<string | null>(() => notas[0]?.id ?? null);
  const [busquedaNota, setBusquedaNota] = useState("");
  const [nuevoCheckNota, setNuevoCheckNota] = useState("");
  const notaActiva = notas.find((n) => n.id === notaAbiertaId) ?? null;

  const filtroNota = busquedaNota.trim().toLowerCase();
  const notasFiltradas = notas.filter(
    (n) =>
      !filtroNota ||
      n.titulo.toLowerCase().includes(filtroNota) ||
      n.contenido.toLowerCase().includes(filtroNota) ||
      n.items.some((i) => i.texto.toLowerCase().includes(filtroNota)),
  );

  const formatoFechaCorta = (iso: ISODate): string =>
    fromISO(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });

  return (
    <section className="notes-only-workspace" aria-label="Bloc de notas">
      <div className="notepad-panel">
        <header className="notepad-header">
          <div>
            <div className="notepad-title-row">
              <h2>Mis notas</h2>
              <span className="pill-counter">{notas.length}</span>
            </div>
            <span className="notepad-saved-hint">✓ Sincronizadas automáticamente en tu cuenta</span>
          </div>
          <button
            type="button"
            className="primary notepad-new-btn"
            onClick={() => {
              const id = onCrearNota();
              setNotaAbiertaId(id);
            }}
          >
            <Icon name="plus" size={15} />Nueva nota
          </button>
        </header>

        {notas.length > 1 && (
          <label className="notepad-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder={`Buscar entre tus ${notas.length} notas…`}
              value={busquedaNota}
              onChange={(e) => setBusquedaNota(e.target.value)}
            />
            {busquedaNota && (
              <button type="button" onClick={() => setBusquedaNota("")} aria-label="Limpiar búsqueda">
                <Icon name="x" size={13} />
              </button>
            )}
          </label>
        )}

        {notaActiva && (
          <div className="notepad-sheet" style={{ "--note-bg": notaActiva.color } as CSSProperties}>
            <div className="notepad-sheet-bar">
              <span className="notepad-editing-badge">Editando nota</span>
              <button
                type="button"
                className="notepad-done-btn"
                onClick={() => setNotaAbiertaId(null)}
              >
                ✓ Listo (cerrar editor)
              </button>
            </div>
            <div className="notepad-sheet-top">
              <input
                className="notepad-title-input"
                placeholder="Título de la nota…"
                value={notaActiva.titulo}
                onChange={(e) => onActualizarNota(notaActiva.id, { titulo: e.target.value })}
              />
              <div className="notepad-colors" aria-label="Color de nota">
                <ColorPalettePicker
                  value={notaActiva.color}
                  onChange={(c) => onActualizarNota(notaActiva.id, { color: c })}
                  ariaLabel="Color de la nota"
                />
                <button
                  type="button"
                  className="notepad-delete-btn"
                  title="Borrar esta nota"
                  aria-label="Borrar esta nota"
                  onClick={() => {
                    const idBorrar = notaActiva.id;
                    const siguiente = notas.find((n) => n.id !== idBorrar);
                    onBorrarNota(idBorrar);
                    setNotaAbiertaId(siguiente?.id ?? null);
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </div>

            <textarea
              className="notepad-textarea"
              rows={5}
              placeholder="Escribe aquí tus notas, enlaces (ej. drive.google.com) o ideas…"
              value={notaActiva.contenido}
              onChange={(e) => onActualizarNota(notaActiva.id, { contenido: e.target.value })}
            />

            {notaActiva.contenido && contieneEnlace(notaActiva.contenido) && (
              <div className="notepad-links-preview">
                <small>Enlaces detectados:</small>
                <TextoConEnlaces texto={notaActiva.contenido} />
              </div>
            )}

            <div className="notepad-checklist">
              <span className="notepad-checklist-title">Casillas de verificación de la nota</span>
              <ul className="live-checklist-ul">
                {notaActiva.items.map((item) => (
                  <li key={item.id} className={item.hecho ? "checked" : ""}>
                    <input
                      type="checkbox"
                      checked={item.hecho}
                      onChange={() =>
                        onActualizarNota(notaActiva.id, {
                          items: notaActiva.items.map((x) => x.id === item.id ? { ...x, hecho: !x.hecho } : x),
                        })
                      }
                    />
                    <input
                      type="text"
                      className="inline-check-input"
                      value={item.texto}
                      onChange={(e) =>
                        onActualizarNota(notaActiva.id, {
                          items: notaActiva.items.map((x) => x.id === item.id ? { ...x, texto: e.target.value } : x),
                        })
                      }
                    />
                    <button
                      type="button"
                      className="inline-check-del"
                      aria-label="Quitar casilla"
                      onClick={() =>
                        onActualizarNota(notaActiva.id, {
                          items: notaActiva.items.filter((x) => x.id !== item.id),
                        })
                      }
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="inline-add-check">
                <input
                  type="text"
                  placeholder="+ Añadir casilla a esta nota…"
                  value={nuevoCheckNota}
                  onChange={(e) => setNuevoCheckNota(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && nuevoCheckNota.trim()) {
                      e.preventDefault();
                      onActualizarNota(notaActiva.id, {
                        items: [...notaActiva.items, { id: `nchk-${Date.now()}`, texto: nuevoCheckNota.trim(), hecho: false }],
                      });
                      setNuevoCheckNota("");
                    }
                  }}
                />
                {nuevoCheckNota.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onActualizarNota(notaActiva.id, {
                        items: [...notaActiva.items, { id: `nchk-${Date.now()}`, texto: nuevoCheckNota.trim(), hecho: false }],
                      });
                      setNuevoCheckNota("");
                    }}
                  >
                    Añadir
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="notepad-saved-section">
          <div className="notepad-saved-header">
            <strong>Todas tus notas ({notasFiltradas.length})</strong>
            <span>Toca cualquier tarjeta para abrirla o marcar sus casillas</span>
          </div>

          {notasFiltradas.length === 0 ? (
            <p className="muted">No hay notas que coincidan.</p>
          ) : (
            <div className="notepad-cards-grid">
              {notasFiltradas.map((n) => {
                const activa = notaActiva?.id === n.id;
                return (
                  <article
                    key={n.id}
                    className={`note-card${activa ? " active" : ""}`}
                    style={{ "--note-bg": n.color } as CSSProperties}
                    onClick={() => setNotaAbiertaId(n.id)}
                  >
                    <header className="note-card-head">
                      <strong>{n.titulo.trim() || "Nota sin título"}</strong>
                      <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="note-card-btn"
                          title="Editar nota"
                          onClick={() => setNotaAbiertaId(n.id)}
                        >
                          <Icon name="pencil" size={12} />
                        </button>
                        <button
                          type="button"
                          className="note-card-btn danger"
                          title="Borrar nota"
                          onClick={() => {
                            onBorrarNota(n.id);
                            if (notaAbiertaId === n.id) setNotaAbiertaId(null);
                          }}
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </header>

                    {n.contenido && <TextoConEnlaces texto={n.contenido} />}

                    {n.items.length > 0 && (
                      <ul className="note-card-checks" onClick={(e) => e.stopPropagation()}>
                        {n.items.map((item) => (
                          <li key={item.id} className={item.hecho ? "checked" : ""}>
                            <input
                              type="checkbox"
                              checked={item.hecho}
                              onChange={() =>
                                onActualizarNota(n.id, {
                                  items: n.items.map((x) => x.id === item.id ? { ...x, hecho: !x.hecho } : x),
                                })
                              }
                            />
                            <span>{item.texto}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <footer className="note-card-foot">
                      <small>Guardada · {formatoFechaCorta(n.actualizadoEn)}</small>
                      {activa && <span className="note-card-open-tag">Abierta</span>}
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
