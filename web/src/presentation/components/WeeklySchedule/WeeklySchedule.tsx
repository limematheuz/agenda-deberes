import { useState, type CSSProperties, type FormEvent } from "react";
import type { Asignatura, ClaseSemanal } from "../../../domain/entities";
import { colorVar } from "../../colors";
import { COLORES_PALETA_BASE, ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Dialog } from "../Dialog/Dialog";
import { Icon } from "../Icon/Icon";
import "./WeeklySchedule.css";

const DIAS_LECTIVOS: ReadonlyArray<{ dia: number; nombre: string; corto: string; inicial: string }> = [
  { dia: 1, nombre: "Lunes", corto: "Lun", inicial: "L" },
  { dia: 2, nombre: "Martes", corto: "Mar", inicial: "M" },
  { dia: 3, nombre: "Miércoles", corto: "Mié", inicial: "X" },
  { dia: 4, nombre: "Jueves", corto: "Jue", inicial: "J" },
  { dia: 5, nombre: "Viernes", corto: "Vie", inicial: "V" },
];

const HORAS_OPCIONES = Array.from({ length: 61 }, (_, i) => {
  const totalMin = 7 * 60 + i * 15; // 07:00 a 22:00 en intervalos de 15 minutos (00, 15, 30, 45)
  const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const m = String(totalMin % 60).padStart(2, "0");
  return `${h}:${m}`;
});

function aMinutos(hora: string): number {
  const [h = 0, m = 0] = hora.split(":").map(Number);
  return h * 60 + m;
}

interface Props {
  clases: readonly ClaseSemanal[];
  asignaturas: readonly Asignatura[];
  onGuardarClase: (clase: Omit<ClaseSemanal, "id">, idEditar?: string) => void;
  onBorrarClase: (id: string) => void;
  onGestionarAsignaturas: () => void;
}

export function WeeklySchedule({
  clases,
  asignaturas,
  onGuardarClase,
  onBorrarClase,
  onGestionarAsignaturas,
}: Props) {
  const mapaAsig = new Map(asignaturas.map((a) => [a.id, a] as const));
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [diaSemana, setDiaSemana] = useState<number>(1);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [titulo, setTitulo] = useState("");
  const [asignaturaId, setAsignaturaId] = useState<string>("");
  const [color, setColor] = useState<string>(COLORES_PALETA_BASE[1]);
  const [aula, setAula] = useState("");
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [vistaExtendida, setVistaExtendida] = useState(false);

  // Rango horario escolar fijo de 08:00 a 18:00 (ampliable automáticamente si existen bloques fuera de ese rango)
  const minHora = Math.min(8, ...clases.map((c) => Math.floor(aMinutos(c.horaInicio) / 60)));
  const maxHora = Math.max(18, ...clases.map((c) => Math.ceil(aMinutos(c.horaFin) / 60)));
  // Cada hora tiene 4 intervalos de 15 minutos (00, 15, 30, 45)
  const totalFilas = (maxHora - minHora) * 4;
  const etiquetasHoras = Array.from({ length: maxHora - minHora }, (_, i) => `${String(minHora + i).padStart(2, "0")}:00`);

  const obtenerTituloClase = (c: ClaseSemanal): string => {
    if (c.titulo?.trim()) return c.titulo.trim();
    const asig = mapaAsig.get(c.asignaturaId);
    return asig?.nombre ?? "Actividad";
  };

  const obtenerColorClase = (c: ClaseSemanal): string => {
    if (c.color?.trim()) return c.color.trim();
    const asig = mapaAsig.get(c.asignaturaId);
    return asig?.color ?? COLORES_PALETA_BASE[1];
  };

  const abrirNuevo = (dia = 1, inicio = "08:00"): void => {
    setEditandoId(null);
    setDiaSemana(dia);
    setHoraInicio(inicio);
    const minFin = Math.min(22 * 60, aMinutos(inicio) + 60);
    setHoraFin(`${String(Math.floor(minFin / 60)).padStart(2, "0")}:${String(minFin % 60).padStart(2, "0")}`);
    setTitulo("");
    setAsignaturaId("");
    setColor(COLORES_PALETA_BASE[clases.length % COLORES_PALETA_BASE.length]);
    setAula("");
    setErrorForm(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (c: ClaseSemanal): void => {
    setEditandoId(c.id);
    setDiaSemana(c.diaSemana);
    setHoraInicio(c.horaInicio);
    setHoraFin(c.horaFin);
    setTitulo(c.titulo ?? "");
    setAsignaturaId(c.asignaturaId ?? "");
    setColor(c.color ?? COLORES_PALETA_BASE[1]);
    setAula(c.aula ?? "");
    setErrorForm(null);
    setModalAbierto(true);
  };

  const elegirSugerencia = (asig: Asignatura): void => {
    setAsignaturaId(asig.id);
    setTitulo(asig.nombre);
    setColor(asig.color);
  };

  const guardar = (e: FormEvent): void => {
    e.preventDefault();
    const ini = aMinutos(horaInicio);
    const fin = aMinutos(horaFin);
    if (fin <= ini) {
      setErrorForm("La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    const tituloFinal = titulo.trim();
    if (!tituloFinal && !asignaturaId) {
      setErrorForm("Escribe un nombre o elige una categoría.");
      return;
    }
    const coincidencia = asignaturas.find((a) => a.nombre.toLowerCase() === tituloFinal.toLowerCase());
    onGuardarClase(
      {
        diaSemana,
        horaInicio,
        horaFin,
        titulo: tituloFinal || undefined,
        asignaturaId: coincidencia?.id ?? asignaturaId ?? "",
        color,
        aula: aula.trim() || undefined,
      },
      editandoId ?? undefined,
    );
    setModalAbierto(false);
  };

  const [arrastrandoClaseId, setArrastrandoClaseId] = useState<string | null>(null);
  const [diaArrastradoSobre, setDiaArrastradoSobre] = useState<number | null>(null);

  const buscarHuecoDuplicar = (
    c: ClaseSemanal,
  ): { dia: number; inicio: string; fin: string } => {
    const duracionMin = aMinutos(c.horaFin) - aMinutos(c.horaInicio);
    const inicioOrig = aMinutos(c.horaInicio);

    // 1. Intentar los siguientes días lectivos (Martes, Miércoles, Jueves, Viernes, Lunes...) a la MISMA hora
    for (let paso = 1; paso < 5; paso++) {
      const targetDia = ((c.diaSemana - 1 + paso) % 5) + 1;
      const solapa = clases.some((otra) => {
        if (otra.id === c.id || otra.diaSemana !== targetDia) return false;
        const oIni = aMinutos(otra.horaInicio);
        const oFin = aMinutos(otra.horaFin);
        return inicioOrig < oFin && inicioOrig + duracionMin > oIni;
      });
      if (!solapa) {
        return { dia: targetDia, inicio: c.horaInicio, fin: c.horaFin };
      }
    }

    // 2. Si a la misma hora todos los días están ocupados, buscar el primer hueco libre en el mismo día después del bloque
    const targetDia = c.diaSemana;
    let candidatoInicio = aMinutos(c.horaFin);
    while (candidatoInicio + duracionMin <= 22 * 60) {
      const solapa = clases.some((otra) => {
        if (otra.diaSemana !== targetDia) return false;
        const oIni = aMinutos(otra.horaInicio);
        const oFin = aMinutos(otra.horaFin);
        return candidatoInicio < oFin && candidatoInicio + duracionMin > oIni;
      });
      if (!solapa) {
        const hIni = String(Math.floor(candidatoInicio / 60)).padStart(2, "0");
        const mIni = String(candidatoInicio % 60).padStart(2, "0");
        const finMin = candidatoInicio + duracionMin;
        const hFin = String(Math.floor(finMin / 60)).padStart(2, "0");
        const mFin = String(finMin % 60).padStart(2, "0");
        return { dia: targetDia, inicio: `${hIni}:${mIni}`, fin: `${hFin}:${mFin}` };
      }
      candidatoInicio += 15;
    }

    // 3. Fallback: siguiente día a las 09:00
    const siguienteDia = (c.diaSemana % 5) + 1;
    const finMin = Math.min(22 * 60, 9 * 60 + duracionMin);
    const hFin = String(Math.floor(finMin / 60)).padStart(2, "0");
    const mFin = String(finMin % 60).padStart(2, "0");
    return { dia: siguienteDia, inicio: "09:00", fin: `${hFin}:${mFin}` };
  };

  const duplicarClase = (id: string): void => {
    const claseOriginal = clases.find((x) => x.id === id);
    if (!claseOriginal) return;
    const hueco = buscarHuecoDuplicar(claseOriginal);
    onGuardarClase({
      diaSemana: hueco.dia,
      horaInicio: hueco.inicio,
      horaFin: hueco.fin,
      asignaturaId: claseOriginal.asignaturaId,
      titulo: claseOriginal.titulo,
      color: claseOriginal.color,
      aula: claseOriginal.aula,
    });
    setModalAbierto(false);
  };

  const onDragStartClase = (e: React.DragEvent, id: string): void => {
    setArrastrandoClaseId(id);
    e.dataTransfer.setData("application/x-schedule-class", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDropClaseEnDia = (e: React.DragEvent<HTMLDivElement>, diaDestino: number): void => {
    e.preventDefault();
    setDiaArrastradoSobre(null);
    const claseId = e.dataTransfer.getData("application/x-schedule-class") || arrastrandoClaseId;
    if (!claseId) return;
    const clase = clases.find((c) => c.id === claseId);
    if (!clase) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = Math.max(0, e.clientY - rect.top);
    const filaHeight = rect.height / totalFilas;
    const filaIndex = Math.max(0, Math.min(totalFilas - 2, Math.floor(offsetY / filaHeight)));
    const nuevoMinInicio = minHora * 60 + filaIndex * 15;
    const duracionMin = aMinutos(clase.horaFin) - aMinutos(clase.horaInicio);
    const nuevoMinFin = Math.min(22 * 60, nuevoMinInicio + duracionMin);

    const hIni = String(Math.floor(nuevoMinInicio / 60)).padStart(2, "0");
    const mIni = String(nuevoMinInicio % 60).padStart(2, "0");
    const hFin = String(Math.floor(nuevoMinFin / 60)).padStart(2, "0");
    const mFin = String(nuevoMinFin % 60).padStart(2, "0");

    onGuardarClase(
      {
        diaSemana: diaDestino,
        horaInicio: `${hIni}:${mIni}`,
        horaFin: `${hFin}:${mFin}`,
        asignaturaId: clase.asignaturaId,
        titulo: clase.titulo,
        color: clase.color,
        aula: clase.aula,
      },
      clase.id,
    );
    setArrastrandoClaseId(null);
  };

  const estiloBloque = (c: ClaseSemanal): CSSProperties => {
    const filaInicio = Math.max(1, Math.floor((aMinutos(c.horaInicio) - minHora * 60) / 15) + 1);
    const duracionFilas = Math.max(1, Math.round((aMinutos(c.horaFin) - aMinutos(c.horaInicio)) / 15));
    return { gridRow: `${filaInicio} / span ${duracionFilas}` };
  };

  return (
    <section className="weekly-schedule" aria-label="Horario semanal">
      <div className="schedule-toolbar">
        <div className="schedule-toolbar-info">
          <p>Organiza tu horario semanal fijo (trabajo, reuniones, deporte o rutinas). Pulsa en cualquier hueco para añadir todos los bloques que quieras.</p>
        </div>
        <div className="schedule-toolbar-actions">
          <div className="schedule-view-toggle" role="group" aria-label="Ajuste de pantalla">
            <button
              type="button"
              className={!vistaExtendida ? "active" : ""}
              onClick={() => setVistaExtendida(false)}
              title="Ajustar los 5 días en pantalla completa sin scroll horizontal"
            >
              5 días en pantalla
            </button>
            <button
              type="button"
              className={vistaExtendida ? "active" : ""}
              onClick={() => setVistaExtendida(true)}
              title="Columnas anchas con desplazamiento horizontal"
            >
              Ampliado
            </button>
          </div>
          <button type="button" className="primary schedule-add-btn" onClick={() => abrirNuevo(1, "09:00")}>
            <Icon name="plus" size={16} />
            <span>Añadir al horario</span>
          </button>
        </div>
      </div>

      <div className={`schedule-board${vistaExtendida ? " schedule-board-extended" : " schedule-board-fit"}`}>
        <div className="schedule-grid-wrap">
          <div className="schedule-time-axis" aria-hidden="true">
            <div className="schedule-axis-head">Hora</div>
            {etiquetasHoras.map((h) => <span key={h}>{h}</span>)}
          </div>

          <div className="schedule-columns">
            {DIAS_LECTIVOS.map((d) => {
              const clasesDia = clases
                .filter((c) => c.diaSemana === d.dia)
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
              return (
                <div key={d.dia} className="schedule-col">
                  <header className="schedule-col-head">
                    <strong className="col-day-full">{d.nombre}</strong>
                    <strong className="col-day-short">{d.corto}</strong>
                    <button type="button" className="schedule-col-add" onClick={() => abrirNuevo(d.dia, "09:00")} title={`Añadir el ${d.nombre}`} aria-label={`Añadir el ${d.nombre}`}>
                      <Icon name="plus" size={13} />
                    </button>
                  </header>
                  <div
                    className={`schedule-col-body${diaArrastradoSobre === d.dia ? " drag-over" : ""}`}
                    style={{ "--rows": totalFilas } as CSSProperties}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (diaArrastradoSobre !== d.dia) setDiaArrastradoSobre(d.dia);
                    }}
                    onDragLeave={() => {
                      if (diaArrastradoSobre === d.dia) setDiaArrastradoSobre(null);
                    }}
                    onDrop={(e) => onDropClaseEnDia(e, d.dia)}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const fila = Math.max(0, Math.min(totalFilas - 4, Math.floor((e.clientY - rect.top) / (rect.height / totalFilas))));
                      const totalMin = minHora * 60 + fila * 15;
                      const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
                      const m = String(totalMin % 60).padStart(2, "0");
                      abrirNuevo(d.dia, `${h}:${m}`);
                    }}
                  >
                    {clasesDia.map((c) => {
                      const nombreBloque = obtenerTituloClase(c);
                      const colorBloque = obtenerColorClase(c);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          draggable
                          onDragStart={(e) => onDragStartClase(e, c.id)}
                          onDragEnd={() => {
                            setArrastrandoClaseId(null);
                            setDiaArrastradoSobre(null);
                          }}
                          className={`schedule-class-card${arrastrandoClaseId === c.id ? " is-dragging" : ""}`}
                          style={{ ...estiloBloque(c), ...colorVar(colorBloque) }}
                          onClick={(e) => { e.stopPropagation(); abrirEdicion(c); }}
                          title={`${nombreBloque} (${c.horaInicio} – ${c.horaFin})${c.aula ? ` · ${c.aula}` : ""} — Arrastra para mover`}
                        >
                          <span className="schedule-class-time">{c.horaInicio}–{c.horaFin}</span>
                          <strong className="schedule-class-title">{nombreBloque}</strong>
                          {c.aula && <small className="schedule-class-room">{c.aula}</small>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Dialog abierto={modalAbierto} titulo={editandoId ? "Editar bloque del horario" : "Añadir al horario semanal"} onCerrar={() => setModalAbierto(false)}>
        <form className="schedule-form" onSubmit={guardar}>
          {errorForm && <p className="schedule-form-error">{errorForm}</p>}
          <label>
            <span>Actividad o bloque</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Escribe cualquier actividad (ej. Reunión de equipo, Gimnasio, Idiomas, Bloque de enfoque…)"
              autoFocus
            />
          </label>
          {asignaturas.length > 0 && (
            <div className="schedule-subject-chips">
              <div className="schedule-chips-head">
                <small>O elige rápido una de tus categorías:</small>
                <button type="button" className="schedule-manage-link" onClick={() => { setModalAbierto(false); onGestionarAsignaturas(); }}>
                  + Gestionar categorías
                </button>
              </div>
              <div className="schedule-chips-list">
                {asignaturas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`schedule-chip${titulo.trim().toLowerCase() === a.nombre.toLowerCase() ? " active" : ""}`}
                    style={{ "--c": a.color } as CSSProperties}
                    onClick={() => elegirSugerencia(a)}
                  >
                    <i style={{ background: a.color }} />
                    <span>{a.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="schedule-color-row">
            <span>Color del bloque</span>
            <ColorPalettePicker value={color} onChange={setColor} ariaLabel="Color del bloque horario" />
          </div>
          <label>
            <span>Día de la semana</span>
            <select className="native-select" value={diaSemana} onChange={(e) => setDiaSemana(Number(e.target.value))}>
              {DIAS_LECTIVOS.map((d) => <option key={d.dia} value={d.dia}>{d.nombre}</option>)}
            </select>
          </label>
          <div className="schedule-form-hours">
            <label>
              <span>Hora de inicio</span>
              <select className="native-select" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}>
                {HORAS_OPCIONES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
            <label>
              <span>Hora de fin</span>
              <select className="native-select" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}>
                {HORAS_OPCIONES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </label>
          </div>
          <label>
            <span>Ubicación, sala o nota (opcional)</span>
            <input value={aula} onChange={(e) => setAula(e.target.value)} placeholder="Ej. Sala B · Oficina · Online" />
          </label>
          <div className="schedule-form-actions">
            <div className="schedule-form-actions-left">
              {editandoId && (
                <>
                  <button
                    type="button"
                    className="task-action remove"
                    onClick={() => {
                      onBorrarClase(editandoId);
                      setModalAbierto(false);
                    }}
                    title="Eliminar este bloque del horario"
                  >
                    <Icon name="trash" size={14} />Quitar bloque
                  </button>
                  <button
                    type="button"
                    className="task-action duplicate-btn"
                    onClick={() => duplicarClase(editandoId)}
                    title="Duplicar bloque en otro día u hora libre"
                  >
                    <Icon name="plus" size={14} />Duplicar
                  </button>
                </>
              )}
            </div>
            <div className="schedule-form-actions-right">
              <button type="button" className="secondary" onClick={() => setModalAbierto(false)}>Cancelar</button>
              <button type="submit" className="primary">Guardar</button>
            </div>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
