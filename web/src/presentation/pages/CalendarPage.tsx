import { useEffect, useMemo, useState } from "react";
import { addDays, formatLong, todayISO } from "../../domain/dates";
import { tipoLabel, type ClaseSemanal, type ISODate, type NotaBloc, type Recordatorio } from "../../domain/entities";
import { describeDays } from "../../domain/urgency";
import { CalendarHeader } from "../components/CalendarHeader/CalendarHeader";
import { DayPanel } from "../components/DayPanel/DayPanel";
import { Dialog } from "../components/Dialog/Dialog";
import { Icon } from "../components/Icon/Icon";
import { MonthView } from "../components/MonthView/MonthView";
import { NotificationPanel } from "../components/NotificationPanel/NotificationPanel";
import { NotesSection, RemindersSection } from "../components/RemindersSection/RemindersSection";
import { obtenerIniciales, Sidebar, type SeccionApp, type UserProfile } from "../components/Sidebar/Sidebar";
import { SubjectsManager } from "../components/SubjectsManager/SubjectsManager";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { Toast } from "../components/Toast/Toast";
import { WeekView } from "../components/WeekView/WeekView";
import { WeeklySchedule } from "../components/WeeklySchedule/WeeklySchedule";
import { useAsignaturas } from "../hooks/useAsignaturas";
import { useCalendarView } from "../hooks/useCalendarView";
import { usePush } from "../hooks/usePush";
import { useTareas } from "../hooks/useTareas";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useUrgencyBadge } from "../hooks/useUrgencyBadge";
import { useServices } from "../ServicesContext";
import "./CalendarPage.css";

interface SubjectCategory { id: string; nombre: string; abierta: boolean }
const CATEGORY_KEY = "agenda-categorias-asignaturas";
const CATEGORY_ASSIGNMENTS_KEY = "agenda-categorias-asignaturas-mapa";
const PROFILE_KEY = "agenda-perfil-usuario";
const SCHEDULE_KEY = "agenda-horario-semanal";
const SCHEDULE_SHOW_KEY = "agenda-mostrar-clases-calendario";
const REMINDERS_KEY = "agenda-recordatorios-lista";
const NOTEPAD_KEY = "agenda-bloc-notas";
const DEFAULT_CATEGORIES: SubjectCategory[] = [{ id: "general", nombre: "General", abierta: true }];

const DEFAULT_REMINDERS: Recordatorio[] = [
  {
    id: "rec-demo-1",
    titulo: "Preparar material para la reunión semanal",
    nota: "Revisar carpeta compartida: https://drive.google.com",
    items: [
      { id: "rc-1", texto: "Exportar presentación en PDF", hecho: true },
      { id: "rc-2", texto: "Compartir enlace con el equipo", hecho: false },
      { id: "rc-3", texto: "Confirmar orden del día", hecho: false },
    ],
    fechaAviso: todayISO(),
    horaAviso: "18:00",
    hecho: false,
    creadoEn: todayISO(),
  },
  {
    id: "rec-demo-2",
    titulo: "Renovar abono de transporte",
    nota: "",
    items: [
      { id: "rc-4", texto: "Revisar fecha de vencimiento", hecho: false },
      { id: "rc-5", texto: "Descargar justificante de pago", hecho: false },
    ],
    fechaAviso: addDays(todayISO(), 2),
    horaAviso: "10:00",
    hecho: false,
    creadoEn: todayISO(),
  },
];

const DEFAULT_NOTES: NotaBloc[] = [
  {
    id: "nota-demo-1",
    titulo: "Notas rápidas de la semana",
    contenido: "Puntos para revisar el jueves:\n• Prioridades del próximo sprint\n• Fechas clave del mes",
    items: [
      { id: "nc-1", texto: "Actualizar hoja de ruta", hecho: true },
      { id: "nc-2", texto: "Revisar pendientes del proyecto", hecho: false },
    ],
    color: "#eab308",
    actualizadoEn: todayISO(),
  },
];

export function CalendarPage() {
  const { auth, userData } = useServices();
  const [cloudCargado, setCloudCargado] = useState(false);
  const tareasApi = useTareas();
  const asigApi = useAsignaturas();
  const push = usePush();
  const cal = useCalendarView();
  const mapa = useMemo(() => new Map(asigApi.asignaturas.map((a) => [a.id, a] as const)), [asigApi.asignaturas]);
  const filtros = useTaskFilters(tareasApi.tareas, mapa);
  const [dia, setDia] = useState<ISODate | null>(null);
  const [verAsig, setVerAsig] = useState(false);
  const [gestorOpciones, setGestorOpciones] = useState<{
    tab: "asignaturas" | "secciones";
    seccionId: string;
    editarAsignaturaId: string | null;
    editarSeccionId: string | null;
  }>({
    tab: "asignaturas",
    seccionId: "general",
    editarAsignaturaId: null,
    editarSeccionId: null,
  });
  const abrirGestor = (opciones?: {
    tab?: "asignaturas" | "secciones";
    seccionId?: string;
    editarAsignaturaId?: string | null;
    editarSeccionId?: string | null;
  }): void => {
    setGestorOpciones({
      tab: opciones?.tab ?? "asignaturas",
      seccionId: opciones?.seccionId ?? "general",
      editarAsignaturaId: opciones?.editarAsignaturaId ?? null,
      editarSeccionId: opciones?.editarSeccionId ?? null,
    });
    setVerAsig(true);
  };
  const [seccion, setSeccion] = useState<SeccionApp>("calendario");
  const [barraContraida, setBarraContraida] = useState(false);
  const [tema, setTema] = useState<"claro" | "oscuro">(() => localStorage.getItem("agenda-tema") === "oscuro" ? "oscuro" : "claro");
  const [asignaturaInicial, setAsignaturaInicial] = useState<string | null>(null);
  const [menuMovil, setMenuMovil] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: "exito" | "error" } | null>(null);
  const [categorias, setCategorias] = useState<SubjectCategory[]>(() => {
    try { const guardadas = JSON.parse(localStorage.getItem(CATEGORY_KEY) ?? "[]") as SubjectCategory[]; return guardadas.length ? guardadas : DEFAULT_CATEGORIES; } catch { return DEFAULT_CATEGORIES; }
  });
  const [categoriaPorAsignatura, setCategoriaPorAsignatura] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(CATEGORY_ASSIGNMENTS_KEY) ?? "{}"); } catch { return {}; }
  });
  const [perfil, setPerfil] = useState<UserProfile>(() => {
    try {
      const guardado = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}") as Partial<UserProfile>;
      const etiquetaGuardada = guardado.curso?.trim() ?? "";
      return {
        nombre: guardado.nombre ?? "",
        curso: !etiquetaGuardada || /^(CFGS|Mi curso)/i.test(etiquetaGuardada) ? "Personal" : etiquetaGuardada,
        email: guardado.email ?? "",
        color: guardado.color ?? "#3b82f6",
      };
    } catch {
      return { nombre: "", curso: "Personal", email: "", color: "#3b82f6" };
    }
  });

  useEffect(() => {
    void auth.obtenerEmail().then((email) => {
      if (email) setPerfil((actual) => ({ ...actual, email }));
    });
  }, [auth]);
  useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(perfil));
    if (cloudCargado) void userData.save({ perfil });
  }, [perfil, cloudCargado, userData]);
  const [horarioInicializado, setHorarioInicializado] = useState<boolean>(() => localStorage.getItem(SCHEDULE_KEY) !== null);
  const [clasesSemanales, setClasesSemanales] = useState<ClaseSemanal[]>(() => {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) ?? "[]") as ClaseSemanal[]; } catch { return []; }
  });
  const [mostrarClasesEnCalendario, setMostrarClasesEnCalendario] = useState<boolean>(() => {
    return localStorage.getItem(SCHEDULE_SHOW_KEY) !== "false";
  });
  useEffect(() => {
    if (horarioInicializado) {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(clasesSemanales));
      if (cloudCargado) void userData.save({ clasesSemanales });
    }
  }, [clasesSemanales, horarioInicializado, cloudCargado, userData]);
  useEffect(() => {
    localStorage.setItem(SCHEDULE_SHOW_KEY, String(mostrarClasesEnCalendario));
    if (cloudCargado) void userData.save({ mostrarClasesEnCalendario });
  }, [mostrarClasesEnCalendario, cloudCargado, userData]);
  useEffect(() => {
    if (!horarioInicializado && asigApi.asignaturas.length > 0) {
      const a0 = asigApi.asignaturas[0];
      const a1 = asigApi.asignaturas[1] ?? a0;
      const a2 = asigApi.asignaturas[2] ?? a0;
      const a3 = asigApi.asignaturas[3] ?? a1;
      setClasesSemanales([
        { id: "c-lun-1", diaSemana: 1, horaInicio: "08:30", horaFin: "10:00", asignaturaId: a0.id, aula: "Sala Norte" },
        { id: "c-lun-2", diaSemana: 1, horaInicio: "10:30", horaFin: "12:00", asignaturaId: a1.id, aula: "Oficina" },
        { id: "c-mar-1", diaSemana: 2, horaInicio: "09:00", horaFin: "11:00", asignaturaId: a2.id, aula: "Online" },
        { id: "c-mie-1", diaSemana: 3, horaInicio: "08:30", horaFin: "10:00", asignaturaId: a0.id, aula: "Sala Norte" },
        { id: "c-jue-1", diaSemana: 4, horaInicio: "11:00", horaFin: "13:00", asignaturaId: a3.id, aula: "Centro deportivo" },
        { id: "c-vie-1", diaSemana: 5, horaInicio: "09:00", horaFin: "10:30", asignaturaId: a2.id, aula: "Sala B" },
      ]);
      setHorarioInicializado(true);
    }
  }, [asigApi.asignaturas, horarioInicializado]);
  const guardarClaseSemanal = (datos: Omit<ClaseSemanal, "id">, idEditar?: string): void => {
    setHorarioInicializado(true);
    if (idEditar) {
      setClasesSemanales((actual) => actual.map((c) => c.id === idEditar ? { ...datos, id: idEditar } : c));
      setToast({ mensaje: "Bloque del horario actualizado.", tipo: "exito" });
    } else {
      setClasesSemanales((actual) => [...actual, { ...datos, id: `clase-${Date.now()}` }]);
      setToast({ mensaje: "Bloque añadido al horario semanal.", tipo: "exito" });
    }
  };
  const borrarClaseSemanal = (id: string): void => {
    setHorarioInicializado(true);
    setClasesSemanales((actual) => actual.filter((c) => c.id !== id));
    setToast({ mensaje: "Bloque quitado del horario.", tipo: "exito" });
  };

  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>(() => {
    try {
      const raw = localStorage.getItem(REMINDERS_KEY);
      return raw !== null ? (JSON.parse(raw) as Recordatorio[]) : DEFAULT_REMINDERS;
    } catch {
      return DEFAULT_REMINDERS;
    }
  });
  const [notasBloc, setNotasBloc] = useState<NotaBloc[]>(() => {
    try {
      const raw = localStorage.getItem(NOTEPAD_KEY);
      const parsed = raw !== null ? (JSON.parse(raw) as NotaBloc[]) : DEFAULT_NOTES;
      return parsed.length > 0 ? parsed : DEFAULT_NOTES;
    } catch {
      return DEFAULT_NOTES;
    }
  });
  useEffect(() => {
    let cancelado = false;
    void userData.load().then((remoto) => {
      if (cancelado) return;
      if (remoto) {
        if (remoto.perfil) setPerfil((actual) => ({ ...actual, ...remoto.perfil }));
        if (remoto.categorias && remoto.categorias.length > 0) setCategorias(remoto.categorias);
        if (remoto.categoriaPorAsignatura) setCategoriaPorAsignatura(remoto.categoriaPorAsignatura);
        if (remoto.clasesSemanales && remoto.clasesSemanales.length > 0) {
          setClasesSemanales(remoto.clasesSemanales);
          setHorarioInicializado(true);
        }
        if (typeof remoto.mostrarClasesEnCalendario === "boolean") {
          setMostrarClasesEnCalendario(remoto.mostrarClasesEnCalendario);
        }
        if (remoto.recordatorios && remoto.recordatorios.length > 0) {
          setRecordatorios(remoto.recordatorios);
        }
        if (remoto.notasBloc && remoto.notasBloc.length > 0) {
          setNotasBloc(remoto.notasBloc);
        }
      }
      setCloudCargado(true);
    });
    return () => { cancelado = true; };
  }, [userData]);

  useEffect(() => {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(recordatorios));
    if (cloudCargado) void userData.save({ recordatorios });
  }, [recordatorios, cloudCargado, userData]);
  useEffect(() => {
    localStorage.setItem(NOTEPAD_KEY, JSON.stringify(notasBloc));
    if (cloudCargado) void userData.save({ notasBloc });
  }, [notasBloc, cloudCargado, userData]);

  const crearRecordatorio = (nuevo: Omit<Recordatorio, "id" | "creadoEn" | "hecho">): void => {
    setRecordatorios((actual) => [
      { ...nuevo, id: `rec-${Date.now()}`, hecho: false, creadoEn: todayISO() },
      ...actual,
    ]);
    setToast({ mensaje: "Recordatorio guardado.", tipo: "exito" });
  };
  const actualizarRecordatorio = (id: string, cambios: Partial<Omit<Recordatorio, "id" | "creadoEn">>): void => {
    setRecordatorios((actual) => actual.map((r) => r.id === id ? { ...r, ...cambios } : r));
  };
  const borrarRecordatorio = (id: string): void => {
    setRecordatorios((actual) => actual.filter((r) => r.id !== id));
    setToast({ mensaje: "Recordatorio eliminado.", tipo: "exito" });
  };
  const crearNotaBloc = (colorInicial = "#eab308"): string => {
    const id = `nota-${Date.now()}`;
    setNotasBloc((actual) => [
      { id, titulo: "Nueva nota", contenido: "", items: [], color: colorInicial, actualizadoEn: todayISO() },
      ...actual,
    ]);
    return id;
  };
  const actualizarNotaBloc = (id: string, cambios: Partial<Omit<NotaBloc, "id">>): void => {
    setNotasBloc((actual) => actual.map((n) => n.id === id ? { ...n, ...cambios, actualizadoEn: todayISO() } : n));
  };
  const borrarNotaBloc = (id: string): void => {
    setNotasBloc((actual) => actual.filter((n) => n.id !== id));
  };

  useEffect(() => { document.documentElement.dataset.theme = tema; localStorage.setItem("agenda-tema", tema); }, [tema]);
  useEffect(() => {
    localStorage.setItem(CATEGORY_KEY, JSON.stringify(categorias));
    if (cloudCargado) void userData.save({ categorias });
  }, [categorias, cloudCargado, userData]);
  useEffect(() => {
    localStorage.setItem(CATEGORY_ASSIGNMENTS_KEY, JSON.stringify(categoriaPorAsignatura));
    if (cloudCargado) void userData.save({ categoriaPorAsignatura });
  }, [categoriaPorAsignatura, cloudCargado, userData]);

  useUrgencyBadge(tareasApi.tareas);

  const salir = (): void => void auth.signOut();
  const error = tareasApi.error ?? asigApi.error ?? push.error;
  useEffect(() => { if (error) setToast({ mensaje: error, tipo: "error" }); }, [error]);
  const abrirDia = (fecha: ISODate, asignaturaId: string | null = null): void => { setAsignaturaInicial(asignaturaId); setDia(fecha); };
  const moverTarea = (id: string, fecha: ISODate, hora?: string | null): void => {
    const tarea = tareasApi.tareas.find((actual) => actual.id === id);
    if (!tarea) return;
    void tareasApi.update(id, { titulo: tarea.titulo, descripcion: tarea.descripcion, tipo: tarea.tipo, asignaturaId: tarea.asignaturaId, fecha, hora: hora === undefined ? tarea.hora : hora });
  };
  const crearDesdeAsignatura = (fecha: ISODate, asignaturaId: string, hora: string | null = null): void => {
    const asignatura = mapa.get(asignaturaId);
    void tareasApi.add({ titulo: `Tarea de ${asignatura?.nombre ?? "categoría"}`, tipo: "otro", fecha, hora, asignaturaId });
    setToast({ mensaje: `Tarea creada${hora ? ` a las ${hora}` : ""}. Puedes editarla al pulsarla.`, tipo: "exito" });
  };
  const crearCategoriaRapida = (nombre: string): string => {
    const id = `categoria-${Date.now()}`;
    setCategorias((actual) => [...actual, { id, nombre, abierta: true }]);
    setToast({ mensaje: "Sección creada.", tipo: "exito" });
    return id;
  };
  const renombrarCategoria = (id: string, nombre: string): void => setCategorias((actual) => actual.map((categoria) => categoria.id === id ? { ...categoria, nombre } : categoria));
  const borrarCategoria = (id: string): void => {
    setCategorias((actual) => actual.filter((categoria) => categoria.id !== id));
    setCategoriaPorAsignatura((actual) => Object.fromEntries(Object.entries(actual).map(([asignaturaId, categoriaId]) => [asignaturaId, categoriaId === id ? "general" : categoriaId])));
    setToast({ mensaje: "Sección eliminada. Sus categorías vuelven a General.", tipo: "exito" });
  };

  const etiquetaSeccion =
    seccion === "resumen"
      ? "Resumen"
      : seccion === "horario"
        ? "Horario semanal"
        : seccion === "recordatorios"
          ? "Recordatorios"
          : seccion === "notas"
            ? "Bloc de notas"
            : "Calendario";

  return (
    <div className={`app ${tema === "oscuro" ? "dark" : ""}`}>
      <div className={barraContraida ? "app-shell collapsed" : "app-shell"}>
      <Sidebar
        asignaturas={asigApi.asignaturas}
        tareas={tareasApi.tareas}
        activa={filtros.asignatura}
        onElegir={(id) => { filtros.setAsignatura(id); setSeccion("calendario"); }}
        onAbrirGestor={abrirGestor}
        onSalir={salir}
        seccion={seccion}
        onSeccion={(nueva) => { if (nueva === "calendario") filtros.setAsignatura("todas"); setSeccion(nueva); }}
        recordatoriosPendientes={recordatorios.filter((r) => !r.hecho).length}
        notasCount={notasBloc.length}
        contraida={barraContraida}
        onAlternar={() => setBarraContraida((v) => !v)}
        onReorder={(origen, destino) => {
          const ids = asigApi.asignaturas.map((a) => a.id).filter((id) => id !== origen);
          ids.splice(ids.indexOf(destino), 0, origen);
          void asigApi.reorder(ids);
        }}
        categorias={categorias}
        categoriaPorAsignatura={categoriaPorAsignatura}
        onAsignarCategoria={(asignaturaId, categoriaId) =>
          setCategoriaPorAsignatura((actual) => ({ ...actual, [asignaturaId]: categoriaId }))
        }
        onAlternarCategoria={(id) =>
          setCategorias((actual) =>
            actual.map((categoria) => (categoria.id === id ? { ...categoria, abierta: !categoria.abierta } : categoria))
          )
        }
        onReorderCategorias={(origen, destino) =>
          setCategorias((actual) => {
            const orden = actual.filter((categoria) => categoria.id !== origen);
            orden.splice(
              orden.findIndex((categoria) => categoria.id === destino),
              0,
              actual.find((categoria) => categoria.id === origen)!
            );
            return orden;
          })
        }
        onBorrarCategoria={borrarCategoria}
        onRemoveAsignatura={asigApi.remove}
        perfil={perfil}
        onGuardarPerfil={(cambios) => {
          setPerfil((actual) => ({ ...actual, ...cambios }));
          setToast({ mensaje: "Perfil actualizado.", tipo: "exito" });
        }}
      />
      <main className="main">
        <div className="crumbs">
          <span className="desktop-crumb">CalendarAppio</span><span className="desktop-crumb"><Icon name="chevron-right" size={14} /></span><b className="desktop-crumb">{etiquetaSeccion}</b>
          <div className="mobile-brand"><span className="logo"><img src="/brand/calendarappio-logo.svg?v=3" alt="" /></span><span>CalendarAppio</span></div>
          <div className="theme-pill" aria-label="Apariencia"><button aria-label="Modo claro" className={tema === "claro" ? "on" : ""} onClick={() => setTema("claro")}><Icon name="sun" size={14} /><span>Claro</span></button><button aria-label="Modo oscuro" className={tema === "oscuro" ? "on" : ""} onClick={() => setTema("oscuro")}><Icon name="moon" size={14} /><span>Oscuro</span></button></div>
          <div className="mobile-actions">
            <button className="icon-btn" onClick={() => setMenuMovil((abierto) => !abierto)} aria-label="Abrir menú" aria-expanded={menuMovil}><Icon name="menu" /></button>
          </div>
        </div>
        <div className="page-title"><h1>{etiquetaSeccion}</h1><div className="page-tools"><span className="synced">Sincronizado automáticamente</span><NotificationPanel tareas={tareasApi.tareas} recordatorios={recordatorios} estado={push.estado} onActivate={() => void push.activar()} onSelect={(t) => { cal.setAncla(t.fecha); abrirDia(t.fecha); }} onSelectRecordatorio={() => setSeccion("recordatorios")} /></div></div>

        {seccion === "resumen" ? (
          <section className="overview" aria-label="Resumen de actividad">
            <div className="summary-cards"><article><span>Por hacer</span><strong>{tareasApi.tareas.filter((t) => !t.hecha).length}</strong></article><article><span>Completados</span><strong>{tareasApi.tareas.filter((t) => t.hecha).length}</strong></article><article><span>Categorías</span><strong>{asigApi.asignaturas.length}</strong></article></div>
            <div className="upcoming"><h2>Próximas tareas</h2>{tareasApi.tareas.filter((t) => !t.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8).map((t) => <button key={t.id} onClick={() => { cal.setAncla(t.fecha); setSeccion("calendario"); }}><i style={{ background: t.asignaturaId ? mapa.get(t.asignaturaId)?.color : "#98a2b3" }} /><span><b>{t.titulo}</b><small>{tipoLabel(t.tipo)} · {describeDays(t.fecha)}</small></span><span>{t.hora?.slice(0, 5) ?? "Todo el día"}</span></button>)}{tareasApi.tareas.every((t) => t.hecha) && <p className="muted">No tienes tareas pendientes.</p>}</div>
          </section>
        ) : seccion === "horario" ? (
          <WeeklySchedule
            clases={clasesSemanales}
            asignaturas={asigApi.asignaturas}
            onGuardarClase={guardarClaseSemanal}
            onBorrarClase={borrarClaseSemanal}
            onGestionarAsignaturas={() => setVerAsig(true)}
          />
        ) : seccion === "recordatorios" ? (
          <RemindersSection
            recordatorios={recordatorios}
            onCrearRecordatorio={crearRecordatorio}
            onActualizarRecordatorio={actualizarRecordatorio}
            onBorrarRecordatorio={borrarRecordatorio}
          />
        ) : seccion === "notas" ? (
          <NotesSection
            notas={notasBloc}
            onCrearNota={crearNotaBloc}
            onActualizarNota={actualizarNotaBloc}
            onBorrarNota={borrarNotaBloc}
          />
        ) : <>
          <Toolbar tipo={filtros.tipo} onTipo={filtros.setTipo} asignatura={filtros.asignatura} onAsignatura={filtros.setAsignatura} asignaturas={asigApi.asignaturas} texto={filtros.texto} onTexto={filtros.setTexto} />
          <section className="mobile-subject-tray" aria-label="Categorías disponibles"><div><b>Categorías</b><span>Toca una para crear una tarea; en escritorio también puedes arrastrarla.</span></div><div className="mobile-subjects">{asigApi.asignaturas.map((asignatura) => <button key={asignatura.id} draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-agenda-subject", asignatura.id); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => abrirDia(todayISO(), asignatura.id)}><i style={{ background: asignatura.color }} />{asignatura.nombre}</button>)}</div></section><section className="cal">
            <CalendarHeader titulo={cal.titulo} inicio={cal.inicio} fin={cal.fin} vista={cal.vista} onVista={cal.setVista} onMover={cal.mover} onHoy={cal.irAHoy} onAnadir={() => abrirDia(todayISO())} />
            {cal.vista === "mes"
              ? <MonthView year={cal.year} month={cal.month} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={crearDesdeAsignatura} onMoveTask={moverTarea} />
              : <WeekView inicio={cal.inicio} dias={cal.vista === "dia" ? 1 : 7} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={crearDesdeAsignatura} onMoveTask={moverTarea} />}
          </section>
        </>}
      </main>
      </div>
      <nav className={`mobile-section-nav${menuMovil ? " open" : ""}`} aria-label="Secciones">
        <header><div className="mobile-drawer-brand"><span className="logo"><img src="/brand/calendarappio-logo.svg?v=3" alt="" /></span><span>CalendarAppio</span></div><button className="icon-btn" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú"><Icon name="x" /></button></header>
        <div className="mobile-menu-links">
          <button className={seccion === "resumen" ? "on" : ""} onClick={() => { setSeccion("resumen"); setMenuMovil(false); }}><Icon name="book" />Resumen</button>
          <button className={seccion === "calendario" ? "on" : ""} onClick={() => { setSeccion("calendario"); setMenuMovil(false); }}><Icon name="calendar" />Calendario</button>
          <button className={seccion === "horario" ? "on" : ""} onClick={() => { setSeccion("horario"); setMenuMovil(false); }}><Icon name="clock" />Horario semanal</button>
          <button className={seccion === "recordatorios" ? "on" : ""} onClick={() => { setSeccion("recordatorios"); setMenuMovil(false); }}><Icon name="bell" />Recordatorios</button>
          <button className={seccion === "notas" ? "on" : ""} onClick={() => { setSeccion("notas"); setMenuMovil(false); }}><Icon name="note" />Bloc de notas</button>
          <button onClick={() => { abrirGestor({ tab: "asignaturas" }); setMenuMovil(false); }}><Icon name="book" />Categorías y secciones</button>
        </div>
        <div className="mobile-menu-bottom">
          <div className="mobile-profile-card">
            <span className="user-avatar" style={{ background: perfil.color }}>{obtenerIniciales(perfil.nombre, perfil.email)}</span>
            <div>
              <div className="user-name-row">
                <strong>{perfil.nombre.trim() || perfil.email.split("@")[0] || "Usuario"}</strong>
                <span className="user-course-badge">{/^(CFGS|Mi curso)/i.test(perfil.curso.trim()) ? "Personal" : (perfil.curso.trim() || "Personal")}</span>
              </div>
              <small>{perfil.email || "Mi cuenta"}</small>
            </div>
          </div>
          <button className="mobile-logout" onClick={salir}><Icon name="logout" />Cerrar sesión</button>
        </div>
      </nav>
      {menuMovil && <button className="mobile-menu-backdrop" aria-label="Cerrar menú" onClick={() => setMenuMovil(false)} />}
      <Toast mensaje={toast?.mensaje ?? null} tipo={toast?.tipo ?? "error"} onCerrar={() => setToast(null)} />

      <Dialog abierto={dia !== null} titulo={dia ? formatLong(dia) : ""} onCerrar={() => { setDia(null); setAsignaturaInicial(null); }}>
        {dia && (
          <DayPanel
            fecha={dia}
            tareas={tareasApi.tareas.filter((t) => t.fecha === dia)}
            asignaturas={asigApi.asignaturas}
            onAdd={tareasApi.add}
            onToggle={tareasApi.toggle}
            onUpdate={tareasApi.update}
            onRemove={tareasApi.remove}
            asignaturaInicial={asignaturaInicial}
          />
        )}
      </Dialog>
      <Dialog abierto={verAsig} titulo={gestorOpciones.tab === "secciones" ? "Gestionar secciones" : "Gestionar categorías"} onCerrar={() => setVerAsig(false)}>
        <SubjectsManager
          asignaturas={asigApi.asignaturas}
          onAdd={asigApi.add}
          onUpdate={asigApi.update}
          onRemove={asigApi.remove}
          categorias={categorias}
          categoriaPorAsignatura={categoriaPorAsignatura}
          onAsignarCategoria={(asignaturaId, categoriaId) => setCategoriaPorAsignatura((actual) => ({ ...actual, [asignaturaId]: categoriaId }))}
          onCrearCategoria={crearCategoriaRapida}
          onRenombrarCategoria={renombrarCategoria}
          onBorrarCategoria={borrarCategoria}
          onReorderCategorias={(origen, destino) =>
            setCategorias((actual) => {
              const orden = actual.filter((categoria) => categoria.id !== origen);
              orden.splice(
                orden.findIndex((categoria) => categoria.id === destino),
                0,
                actual.find((categoria) => categoria.id === origen)!
              );
              return orden;
            })
          }
          tabInicial={gestorOpciones.tab}
          seccionPreseleccionada={gestorOpciones.seccionId}
          asignaturaEditarInicial={gestorOpciones.editarAsignaturaId}
          seccionEditarInicial={gestorOpciones.editarSeccionId}
        />
      </Dialog>
    </div>
  );
}
