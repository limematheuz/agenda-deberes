import { useState, type CSSProperties, type FormEvent } from "react";
import type { Asignatura, ClaseSemanal } from "../../../domain/entities";
import { colorVar } from "../../colors";
import { COLORES_PALETA_BASE, ColorPalettePicker } from "../ColorPalettePicker/ColorPalettePicker";
import { Dialog } from "../Dialog/Dialog";
import { Icon } from "../Icon/Icon";
import "./WeeklySchedule.css";

const DIAS_LECTIVOS: ReadonlyArray<{ dia: number; nombre: string; corto: string }> = [
  { dia: 1, nombre: "Lunes", corto: "Lun" },
  { dia: 2, nombre: "Martes", corto: "Mar" },
  { dia: 3, nombre: "Miércoles", corto: "Mié" },
  { dia: 4, nombre: "Jueves", corto: "Jue" },
  { dia: 5, nombre: "Viernes", corto: "Vie" },
];

const HORAS_OPCIONES = Array.from({ length: 31 }, (_, i) => {
  const totalMin = 7 * 60 + i * 30; // 07:00 a 22:00
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
  const [diaMovil, setDiaMovil] = useState<number>(() => {
    const hoy = new Date().getDay();
    return hoy >= 1 && hoy <= 5 ? hoy : 1;
  });

  // Calculamos rango horario visible (mínimo 08:00 a 18:00, ampliable según los bloques)
  const minHora = Math.min(8, ...clases.map((c) => Math.floor(aMinutos(c.horaInicio) / 60)));
  const maxHora = Math.max(18, ...clases.map((c) => Math.ceil(aMinutos(c.horaFin) / 60)));
  const totalMediaHoras = (maxHora - minHora) * 2;
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
    setTitulo(obtenerTituloClase(c));
    setAsignaturaId(c.asignaturaId);
    setColor(obtenerColorClase(c));
    setAula(c.aula ?? "");
    setErrorForm(null);
    setModalAbierto(true);
  };

  const elegirSugerencia = (a: Asignatura): void => {
    setTitulo(a.nombre);
    setAsignaturaId(a.id);
    setColor(a.color);
  };

  const guardar = (e: FormEvent): void => {
    e.preventDefault();
    const nombreLimpio = titulo.trim();
    if (!nombreLimpio) {
      setErrorForm("Escribe el nombre de la actividad o bloque.");
      return;
    }
    if (aMinutos(horaFin) <= aMinutos(horaInicio)) {
      setErrorForm("La hora de fin debe ser posterior a la de inicio.");
      return;
    }
    const coincidencia = asignaturas.find((a) => a.nombre.toLowerCase() === nombreLimpio.toLowerCase());
    onGuardarClase(
      {
        diaSemana,
        horaInicio,
        horaFin,
        asignaturaId: coincidencia?.id ?? asignaturaId ?? "",
        titulo: nombreLimpio,
        color,
        aula: aula.trim() || null,
      },
      editandoId ?? undefined,
    );
    setModalAbierto(false);
  };

  const estiloBloque = (c: ClaseSemanal): CSSProperties => {
    const filaInicio = Math.max(1, Math.floor((aMinutos(c.horaInicio) - minHora * 60) / 30) + 1);
    const duracionFilas = Math.max(1, Math.round((aMinutos(c.horaFin) - aMinutos(c.horaInicio)) / 30));
    return { gridRow: `${filaInicio} / span ${duracionFilas}` };
  };

  return (
    <section className="weekly-schedule" aria-label="Horario semanal">
      <div className="schedule-toolbar">
        <div className="schedule-toolbar-info">
          <p>Organiza tu horario semanal fijo (trabajo, reuniones, deporte o rutinas). Pulsa en cualquier hueco para añadir todos los bloques que quieras.</p>
        </div>
        <div className="schedule-toolbar-actions">
          <button type="button" className="primary schedule-add-btn" onClick={() => abrirNuevo(diaMovil, "09:00")}>
            <Icon name="plus" size={16} />
            <span>Añadir al horario</span>
          </button>
        </div>
      </div>

      <div className="schedule-board">
        <div className="schedule-mobile-days" aria-label="Día de la semana">
          {DIAS_LECTIVOS.map((d) => (
            <button key={d.dia} type="button" className={diaMovil === d.dia ? "on" : ""} onClick={() => setDiaMovil(d.dia)}>
              <span>{d.corto}</span>
              <small>{clases.filter((c) => c.diaSemana === d.dia).length} bloques</small>
            </button>
          ))}
        </div>

        <div className="schedule-grid-wrap">
          <div className="schedule-time-axis" aria-hidden="true">
            <div className="schedule-axis-head" />
            {etiquetasHoras.map((h) => <span key={h}>{h}</span>)}
          </div>

          <div className="schedule-columns">
            {DIAS_LECTIVOS.map((d) => {
              const clasesDia = clases
                .filter((c) => c.diaSemana === d.dia)
                .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
              return (
                <div key={d.dia} className={`schedule-col${diaMovil === d.dia ? " mobile-active" : ""}`}>
                  <header className="schedule-col-head">
                    <strong>{d.nombre}</strong>
                    <button type="button" className="schedule-col-add" onClick={() => abrirNuevo(d.dia, "09:00")} title={`Añadir el ${d.nombre}`} aria-label={`Añadir el ${d.nombre}`}>
                      <Icon name="plus" size={14} />
                    </button>
                  </header>
                  <div
                    className="schedule-col-body"
                    style={{ "--rows": totalMediaHoras } as CSSProperties}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const fila = Math.max(0, Math.min(totalMediaHoras - 2, Math.floor((e.clientY - rect.top) / 32)));
                      const totalMin = minHora * 60 + fila * 30;
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
                          className="schedule-class-card"
                          style={{ ...estiloBloque(c), ...colorVar(colorBloque) }}
                          onClick={(e) => { e.stopPropagation(); abrirEdicion(c); }}
                        >
                          <span className="schedule-class-time">{c.horaInicio} – {c.horaFin}</span>
                          <strong>{nombreBloque}</strong>
                          {c.aula && <small>{c.aula}</small>}
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
            {editandoId && (
              <button
                type="button"
                className="task-action remove"
                onClick={() => {
                  onBorrarClase(editandoId);
                  setModalAbierto(false);
                }}
              >
                <Icon name="trash" size={14} />Quitar bloque
              </button>
            )}
            <div className="spacer" />
            <button type="button" className="secondary" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button type="submit" className="primary">Guardar en horario</button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
