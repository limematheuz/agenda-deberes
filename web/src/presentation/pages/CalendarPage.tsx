import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { addDays, formatLong, todayISO } from "../../domain/dates";
import { type ClaseSemanal, type ISODate, type NotaBloc, type Recordatorio } from "../../domain/entities";
import { describeDays } from "../../domain/urgency";
import { CalendarHeader } from "../components/CalendarHeader/CalendarHeader";
import { DayPanel } from "../components/DayPanel/DayPanel";
import { Dialog } from "../components/Dialog/Dialog";
import { Icon } from "../components/Icon/Icon";
import { MonthView } from "../components/MonthView/MonthView";
import { NotificationPanel } from "../components/NotificationPanel/NotificationPanel";
import { NotesSection, RemindersSection } from "../components/RemindersSection/RemindersSection";
import { obtenerIniciales, Sidebar, type SeccionApp, type UserProfile } from "../components/Sidebar/Sidebar";
import { CategoriesModal } from "../components/SubjectsManager/CategoriesModal";
import { SectionsModal } from "../components/SubjectsManager/SectionsModal";
import { ColorPalettePicker } from "../components/ColorPalettePicker/ColorPalettePicker";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { Toast } from "../components/Toast/Toast";
import { WeekView } from "../components/WeekView/WeekView";
import { WeeklySchedule } from "../components/WeeklySchedule/WeeklySchedule";
import { useAsignaturas } from "../hooks/useAsignaturas";
import { useCalendarView } from "../hooks/useCalendarView";
import { usePush } from "../hooks/usePush";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useTareas } from "../hooks/useTareas";
import { evaluarYNotificarPendientes, mostrarNotificacionDispositivo } from "../../infrastructure/push/local-notifier";
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
  const syncState = useSyncStatus();
  const cal = useCalendarView();

  const syncLabelDesktop =
    syncState.status === "syncing"
      ? "Sincronizando..."
      : syncState.status === "offline"
        ? syncState.pendingCount > 0
          ? `Sin conexión (${syncState.pendingCount} pend.)`
          : "Sin conexión · Local"
        : syncState.status === "pending" || syncState.status === "error"
          ? `${syncState.pendingCount} pend. · Reintentar`
          : "Sincronizado";

  const syncLabelMobile =
    syncState.status === "syncing"
      ? "Sincronizando cambios..."
      : syncState.status === "offline"
        ? syncState.pendingCount > 0
          ? `Sin conexión (${syncState.pendingCount} pendientes en el dispositivo)`
          : "Sin conexión (guardado localmente)"
        : syncState.status === "pending" || syncState.status === "error"
          ? `${syncState.pendingCount} pendientes · Toca para sincronizar`
          : "Sincronizado automáticamente";
  const mapa = useMemo(() => new Map(asigApi.asignaturas.map((a) => [a.id, a] as const)), [asigApi.asignaturas]);
  const filtros = useTaskFilters(tareasApi.tareas, mapa);
  const [dia, setDia] = useState<ISODate | null>(null);
  const [modalCategorias, setModalCategorias] = useState(false);
  const [categoriaEditarId, setCategoriaEditarId] = useState<string | null>(null);
  const [seccionInicialCat, setSeccionInicialCat] = useState<string>("general");

  const [modalSecciones, setModalSecciones] = useState(false);
  const [seccionEditarId, setSeccionEditarId] = useState<string | null>(null);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [nombrePerfil, setNombrePerfil] = useState("");
  const [cursoPerfil, setCursoPerfil] = useState("");
  const [colorPerfil, setColorPerfil] = useState("#3b82f6");

  const abrirGestor = (opciones?: {
    tab?: "asignaturas" | "secciones";
    seccionId?: string;
    editarAsignaturaId?: string | null;
    editarSeccionId?: string | null;
  }): void => {
    if (opciones?.tab === "secciones") {
      setSeccionEditarId(opciones.editarSeccionId ?? null);
      setModalSecciones(true);
    } else {
      setCategoriaEditarId(opciones?.editarAsignaturaId ?? null);
      setSeccionInicialCat(opciones?.seccionId ?? "general");
      setModalCategorias(true);
    }
  };

  const abrirPerfil = (): void => {
    setNombrePerfil(perfil.nombre);
    setCursoPerfil(perfil.curso);
    setColorPerfil(perfil.color);
    setEditandoPerfil(true);
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

  useEffect(() => {
    if (!menuMovil) return;
    const scrollY = window.scrollY;
    const prevPosition = document.body.style.position;
    const prevTop = document.body.style.top;
    const prevWidth = document.body.style.width;
    const prevOverflow = document.body.style.overflow;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = prevPosition;
      document.body.style.top = prevTop;
      document.body.style.width = prevWidth;
      document.body.style.overflow = prevOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [menuMovil]);

  const salir = async (): Promise<void> => {
    setMenuMovil(false);
    try {
      await auth.signOut();
    } catch {
      // Ignorar
    }
  };
  const error = tareasApi.error ?? asigApi.error ?? push.error;
  useEffect(() => { if (error) setToast({ mensaje: error, tipo: "error" }); }, [error]);

  useEffect(() => {
    if (push.estado !== "activo") return;
    void evaluarYNotificarPendientes(tareasApi.tareas, recordatorios);
    const id = window.setInterval(() => {
      void evaluarYNotificarPendientes(tareasApi.tareas, recordatorios);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [push.estado, tareasApi.tareas, recordatorios]);

  const probarAvisoDispositivo = async (): Promise<void> => {
    const ok = await mostrarNotificacionDispositivo(
      "CalendarAppio · Prueba de aviso",
      "Las notificaciones del dispositivo están funcionando correctamente.",
      "calendarappio-test",
    );
    setToast({
      mensaje: ok
        ? "Notificación enviada al dispositivo."
        : "No se pudo mostrar el aviso. Revisa los permisos del sistema (macOS / Android).",
      tipo: ok ? "exito" : "error",
    });
  };
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
  const crearDesdeBloqueHorario = (fecha: ISODate, claseId: string, hora?: string | null): void => {
    const clase = clasesSemanales.find((c) => c.id === claseId);
    if (!clase) return;
    const asig = clase.asignaturaId ? mapa.get(clase.asignaturaId) : null;
    const nombre = clase.titulo?.trim() || asig?.nombre || "Bloque horario";
    void tareasApi.add({
      titulo: nombre,
      descripcion: clase.aula ? `Ubicación: ${clase.aula}` : null,
      tipo: "otro",
      fecha,
      hora: hora || clase.horaInicio,
      asignaturaId: clase.asignaturaId || null,
    });
    setToast({ mensaje: `Bloque "${nombre}" añadido al calendario.`, tipo: "exito" });
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

  const hoyISO = todayISO();
  const diaHoySemana = new Date().getDay() === 0 ? 7 : new Date().getDay();
  const nombreDiaSemana = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][new Date().getDay()];
  const fechaHoyFormateada = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  const tareasPendientes = tareasApi.tareas.filter((t) => !t.hecha);
  const tareasHoy = tareasPendientes.filter((t) => t.fecha === hoyISO);
  const recordatoriosActivos = recordatorios.filter((r) => !r.hecho);
  const clasesHoy = clasesSemanales
    .filter((c) => c.diaSemana === diaHoySemana)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  const compartirApp = async (): Promise<void> => {
    const url = window.location.origin;
    const datosBase = {
      title: "CalendarAppio",
      text: "Organiza tu calendario, horario semanal, recordatorios y bloc de notas con CalendarAppio.",
      url,
    };
    if (navigator.share) {
      try {
        try {
          const resp = await fetch("/brand/calendarappio-share.png");
          if (resp.ok) {
            const blob = await resp.blob();
            const archivoLogo = new File([blob], "calendarappio.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [archivoLogo] })) {
              await navigator.share({
                ...datosBase,
                files: [archivoLogo],
              });
              setToast({ mensaje: "Enlace y tarjeta compartidos.", tipo: "exito" });
              return;
            }
          }
        } catch {
          // Fallback a compartir texto normal
        }

        await navigator.share(datosBase);
        setToast({ mensaje: "Enlace compartido.", tipo: "exito" });
      } catch {
        // Cancelado por el usuario
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setToast({ mensaje: "Enlace copiado al portapapeles. ¡Listo para compartir!", tipo: "exito" });
      } catch {
        setToast({ mensaje: `Copia este enlace: ${url}`, tipo: "exito" });
      }
    }
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
        textoBusqueda={filtros.texto}
        onTextoBusqueda={filtros.setTexto}
      />
      <main className="main">
        <div className="crumbs">
          <div className="crumbs-left">
            <span className="desktop-crumb">CalendarAppio</span>
            <span className="desktop-crumb"><Icon name="chevron-right" size={14} /></span>
            <b className="desktop-crumb">{etiquetaSeccion}</b>
            <button
              type="button"
              className={`synced-compact status-${syncState.status}`}
              onClick={syncState.syncNow}
              title={
                syncState.status === "offline"
                  ? "Sin internet: tus cambios se guardan en este dispositivo y se subirán automáticamente al reconectar"
                  : syncState.pendingCount > 0
                    ? "Pulsa para sincronizar ahora los cambios pendientes"
                    : "Tus datos se guardan y sincronizan automáticamente en tu cuenta"
              }
            >
              <i className={`synced-dot status-${syncState.status}`} />
              <span className="synced-label">{syncLabelDesktop}</span>
            </button>
          </div>
          <div className="mobile-brand">
            <span className="logo"><img src="/brand/calendarappio-logo.svg?v=3" alt="CalendarAppio" /></span>
            <span className="mobile-brand-name">CalendarAppio</span>
          </div>
          <div className="header-right-actions">
            <button
              type="button"
              className="share-header-btn"
              onClick={() => void compartirApp()}
              title="Compartir enlace de CalendarAppio"
              aria-label="Compartir aplicación"
            >
              <Icon name="share" size={16} />
            </button>
            <NotificationPanel
              tareas={tareasApi.tareas}
              recordatorios={recordatorios}
              estado={push.estado}
              onActivate={() => void push.activar()}
              onTest={() => void probarAvisoDispositivo()}
              onSelect={(t) => { cal.setAncla(t.fecha); abrirDia(t.fecha); }}
              onSelectRecordatorio={() => setSeccion("recordatorios")}
            />
            <div className="theme-pill desktop-theme-pill" aria-label="Apariencia">
              <button aria-label="Modo claro" className={tema === "claro" ? "on" : ""} onClick={() => setTema("claro")}><Icon name="sun" size={14} /><span>Claro</span></button>
              <button aria-label="Modo oscuro" className={tema === "oscuro" ? "on" : ""} onClick={() => setTema("oscuro")}><Icon name="moon" size={14} /><span>Oscuro</span></button>
            </div>
            <div className="mobile-actions">
              <button className="icon-btn" onClick={() => setMenuMovil((abierto) => !abierto)} aria-label="Abrir menú" aria-expanded={menuMovil}><Icon name="menu" /></button>
            </div>
          </div>
        </div>
        {seccion !== "calendario" && (
          <div className="page-title">
            <div>
              <h1>{etiquetaSeccion}</h1>
              {seccion === "resumen" && (
                <p className="overview-welcome">
                  Hola, <strong>{perfil.nombre.trim() || perfil.email.split("@")[0] || "bienvenido"}</strong> · {fechaHoyFormateada}
                </p>
              )}
            </div>
          </div>
        )}

        {seccion === "resumen" ? (
          <section className="overview" aria-label="Resumen de actividad">
            {/* Tarjetas KPI interactivas */}
            <div className="summary-cards" role="region" aria-label="Indicadores clave">
              <article className="summary-card summary-card-tasks" onClick={() => setSeccion("calendario")} title="Ver todas las tareas pendientes">
                <div className="summary-card-tasks-content">
                  <div className="summary-card-tasks-left">
                    <span className="summary-card-icon icon-tasks"><Icon name="calendar" size={17} /></span>
                    <div className="summary-card-tasks-text">
                      <span className="summary-card-tag">Tareas</span>
                      <span className="summary-card-label">Por hacer · {tareasHoy.length} hoy</span>
                    </div>
                  </div>
                  <strong className="summary-card-num">{tareasPendientes.length}</strong>
                </div>
              </article>

              <article className="summary-card summary-card-square" onClick={() => setSeccion("calendario")} title="Ver tareas de hoy">
                <div className="summary-card-top">
                  <span className="summary-card-icon icon-today"><Icon name="clock" size={16} /></span>
                  <span className="summary-card-tag">Hoy</span>
                </div>
                <strong className="summary-card-num">{tareasHoy.length}</strong>
                <span className="summary-card-label">Entregas de hoy</span>
              </article>

              <article className="summary-card summary-card-square" onClick={() => setSeccion("horario")} title="Ver horario semanal">
                <div className="summary-card-top">
                  <span className="summary-card-icon icon-schedule"><Icon name="book" size={16} /></span>
                  <span className="summary-card-tag">Horario</span>
                </div>
                <strong className="summary-card-num">{clasesHoy.length}</strong>
                <span className="summary-card-label">Bloques hoy ({clasesSemanales.length} sem)</span>
              </article>

              <article className="summary-card summary-card-square" onClick={() => setSeccion("recordatorios")} title="Ver recordatorios">
                <div className="summary-card-top">
                  <span className="summary-card-icon icon-reminders"><Icon name="bell" size={16} /></span>
                  <span className="summary-card-tag">Avisos</span>
                </div>
                <strong className="summary-card-num">{recordatoriosActivos.length}</strong>
                <span className="summary-card-label">Avisos activos</span>
              </article>

              <article className="summary-card summary-card-square" onClick={() => setSeccion("notas")} title="Ver bloc de notas">
                <div className="summary-card-top">
                  <span className="summary-card-icon icon-notes"><Icon name="note" size={16} /></span>
                  <span className="summary-card-tag">Notas</span>
                </div>
                <strong className="summary-card-num">{notasBloc.length}</strong>
                <span className="summary-card-label">Notas en tu bloc</span>
              </article>
            </div>

            {/* Cuadrícula central: Próximas tareas + Widgets de Horario, Recordatorios y Notas */}
            <div className="overview-grid">
              <section className="overview-panel overview-tasks">
                <div className="overview-panel-head">
                  <div>
                    <h2>Próximas tareas</h2>
                    <span className="overview-subtitle">{tareasPendientes.length} pendientes en tu agenda</span>
                  </div>
                  <button type="button" className="overview-link-btn" onClick={() => setSeccion("calendario")}>
                    Ver calendario →
                  </button>
                </div>

                <div className="overview-task-list">
                  {tareasPendientes.slice(0, 6).map((t) => {
                    const cat = t.asignaturaId ? mapa.get(t.asignaturaId) : null;
                    const esHoy = t.fecha === hoyISO;
                    return (
                      <article key={t.id} className={`overview-task-item${esHoy ? " is-today" : ""}`}>
                        <button
                          type="button"
                          className={`overview-check-btn${t.hecha ? " checked" : ""}`}
                          onClick={(e) => { e.stopPropagation(); void tareasApi.toggle(t); }}
                          title="Marcar como hecha"
                          aria-label="Marcar como hecha"
                        >
                          <span className="check-box" />
                        </button>
                        <div className="overview-task-body" onClick={() => { cal.setAncla(t.fecha); abrirDia(t.fecha); }}>
                          <div className="overview-task-title-row">
                            <strong>{t.titulo}</strong>
                            {cat && <span className="overview-cat-pill" style={{ "--cat-c": cat.color } as CSSProperties}>{cat.nombre}</span>}
                          </div>
                          <div className="overview-task-meta">
                            <span className={`overview-date-pill${esHoy ? " today" : ""}`}>
                              {describeDays(t.fecha)}
                            </span>
                            {t.hora && <span className="overview-time-pill"><Icon name="clock" size={11} />{t.hora.slice(0, 5)}</span>}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {tareasPendientes.length === 0 && (
                    <div className="overview-empty">
                      <p>¡Todo al día! No tienes tareas pendientes.</p>
                      <button type="button" className="primary" onClick={() => abrirDia(hoyISO)}>
                        <Icon name="plus" size={14} /> Añadir tarea
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <div className="overview-widgets">
                {/* Horario de hoy */}
                <section className="overview-panel overview-today-schedule">
                  <div className="overview-panel-head">
                    <div>
                      <h2>Horario de hoy</h2>
                      <span className="overview-subtitle">{nombreDiaSemana} · {clasesHoy.length} {clasesHoy.length === 1 ? "bloque" : "bloques"}</span>
                    </div>
                    <button type="button" className="overview-link-btn" onClick={() => setSeccion("horario")}>
                      Ver horario →
                    </button>
                  </div>
                  <div className="overview-schedule-list">
                    {clasesHoy.map((c) => {
                      const asig = c.asignaturaId ? mapa.get(c.asignaturaId) : null;
                      const nombreBloque = c.titulo?.trim() || asig?.nombre || "Actividad";
                      const colorBloque = c.color || asig?.color || "#3b82f6";
                      return (
                        <div key={c.id} className="overview-schedule-item" style={{ "--c": colorBloque } as CSSProperties} onClick={() => setSeccion("horario")}>
                          <span className="schedule-item-time">{c.horaInicio} – {c.horaFin}</span>
                          <div className="schedule-item-info">
                            <strong>{nombreBloque}</strong>
                            {c.aula && <small>{c.aula}</small>}
                          </div>
                        </div>
                      );
                    })}
                    {clasesHoy.length === 0 && (
                      <p className="overview-empty-text">Sin bloques fijos programados para hoy {nombreDiaSemana}.</p>
                    )}
                  </div>
                </section>

                {/* Avisos pendientes */}
                <section className="overview-panel overview-reminders">
                  <div className="overview-panel-head">
                    <div>
                      <h2>Avisos pendientes</h2>
                      <span className="overview-subtitle">{recordatoriosActivos.length} activos</span>
                    </div>
                    <button type="button" className="overview-link-btn" onClick={() => setSeccion("recordatorios")}>
                      Ver todos →
                    </button>
                  </div>
                  <div className="overview-reminders-list">
                    {recordatoriosActivos.slice(0, 3).map((r) => (
                      <div key={r.id} className="overview-reminder-item">
                        <button
                          type="button"
                          className="overview-check-btn"
                          onClick={() => void actualizarRecordatorio(r.id, { hecho: true })}
                          title="Marcar recordatorio como hecho"
                        >
                          <span className="check-box" />
                        </button>
                        <div className="overview-reminder-info" onClick={() => setSeccion("recordatorios")}>
                          <p>{r.titulo}</p>
                          {r.fechaAviso && <small className="reminder-due">{r.fechaAviso}</small>}
                        </div>
                      </div>
                    ))}
                    {recordatoriosActivos.length === 0 && (
                      <p className="overview-empty-text">Sin avisos pendientes. ¡Todo en orden!</p>
                    )}
                  </div>
                </section>

                {/* Bloc de notas preview */}
                <section className="overview-panel overview-notes">
                  <div className="overview-panel-head">
                    <div>
                      <h2>Bloc de notas</h2>
                      <span className="overview-subtitle">{notasBloc.length} notas guardadas</span>
                    </div>
                    <button type="button" className="overview-link-btn" onClick={() => setSeccion("notas")}>
                      Abrir bloc →
                    </button>
                  </div>
                  <div className="overview-notes-preview" onClick={() => setSeccion("notas")}>
                    {notasBloc.slice(0, 2).map((n) => (
                      <article key={n.id} className="overview-note-mini" style={{ "--note-c": n.color } as CSSProperties}>
                        <strong>{n.titulo.trim() || "Nota sin título"}</strong>
                        {n.contenido && <p>{n.contenido.slice(0, 75)}...</p>}
                        {n.items && n.items.length > 0 && (
                          <small>{n.items.filter((i) => i.hecho).length}/{n.items.length} casillas listas</small>
                        )}
                      </article>
                    ))}
                    {notasBloc.length === 0 && (
                      <p className="overview-empty-text">No tienes notas todavía. Toca para redactar una.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        ) : seccion === "horario" ? (
          <WeeklySchedule
            clases={clasesSemanales}
            asignaturas={asigApi.asignaturas}
            onGuardarClase={guardarClaseSemanal}
            onBorrarClase={borrarClaseSemanal}
            onGestionarAsignaturas={() => setModalCategorias(true)}
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
          <Toolbar tipo={filtros.tipo} onTipo={filtros.setTipo} asignatura={filtros.asignatura} onAsignatura={filtros.setAsignatura} asignaturas={asigApi.asignaturas} />
          <section className="mobile-subject-tray" aria-label="Categorías disponibles">
            <div className="mobile-tray-head">
              <div>
                <b>Categorías</b>
                <span>Toca una para crear una tarea</span>
              </div>
              <button
                type="button"
                className="mobile-tray-add-btn"
                onClick={() => abrirGestor({ tab: "asignaturas" })}
                title="Crear nueva categoría"
              >
                <Icon name="plus" size={12} />Nueva
              </button>
            </div>
            <div className="mobile-subjects">
              {asigApi.asignaturas.map((asignatura) => (
                <button
                  key={asignatura.id}
                  className="cat-badge-btn"
                  style={{ "--c": asignatura.color } as CSSProperties}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/x-agenda-subject", asignatura.id);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => abrirDia(todayISO(), asignatura.id)}
                >
                  <i style={{ background: asignatura.color }} />
                  {asignatura.nombre}
                </button>
              ))}
            </div>
          </section>
          <section className="cal">
            <CalendarHeader titulo={cal.titulo} inicio={cal.inicio} fin={cal.fin} vista={cal.vista} onVista={cal.setVista} onMover={cal.mover} onHoy={cal.irAHoy} onAnadir={() => abrirDia(todayISO())} />
            {cal.vista === "mes"
              ? <MonthView year={cal.year} month={cal.month} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={crearDesdeAsignatura} onDropScheduleClass={crearDesdeBloqueHorario} onMoveTask={moverTarea} />
              : <WeekView inicio={cal.inicio} dias={cal.vista === "dia" ? 1 : 7} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={crearDesdeAsignatura} onDropScheduleClass={crearDesdeBloqueHorario} onMoveTask={moverTarea} />}
          </section>
        </>}
      </main>
      </div>
      <nav className={`mobile-section-nav${menuMovil ? " open" : ""}`} aria-label="Navegación móvil">
        <header className="mobile-drawer-header">
          <div className="mobile-drawer-brand">
            <span className="logo"><img src="/brand/calendarappio-logo.svg?v=3" alt="" /></span>
            <span>CalendarAppio</span>
          </div>
          <button type="button" className="icon-btn mobile-drawer-close" onClick={() => setMenuMovil(false)} aria-label="Cerrar menú">
            <Icon name="x" />
          </button>
        </header>

        <div className="mobile-drawer-scroll">
          <div className="mobile-drawer-search">
            <Icon name="search" size={15} />
            <input
              type="text"
              placeholder="Buscar..."
              value={filtros.texto}
              onChange={(e) => filtros.setTexto(e.target.value)}
              aria-label="Buscar en la agenda"
            />
            {filtros.texto && (
              <button
                type="button"
                className="mobile-search-clear"
                onClick={() => filtros.setTexto("")}
                aria-label="Limpiar búsqueda"
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </div>

          <div className="mobile-menu-links">
            <button type="button" className={seccion === "resumen" ? "on" : ""} onClick={() => { setSeccion("resumen"); setMenuMovil(false); }}><Icon name="book" />Resumen</button>
            <button type="button" className={seccion === "calendario" ? "on" : ""} onClick={() => { setSeccion("calendario"); setMenuMovil(false); }}><Icon name="calendar" />Calendario</button>
            <button type="button" className={seccion === "horario" ? "on" : ""} onClick={() => { setSeccion("horario"); setMenuMovil(false); }}><Icon name="clock" />Horario semanal</button>
            <button type="button" className={seccion === "recordatorios" ? "on" : ""} onClick={() => { setSeccion("recordatorios"); setMenuMovil(false); }}><Icon name="bell" />Recordatorios</button>
            <button type="button" className={seccion === "notas" ? "on" : ""} onClick={() => { setSeccion("notas"); setMenuMovil(false); }}><Icon name="note" />Bloc de notas</button>
            <button type="button" className="mobile-menu-share-btn" onClick={() => { void compartirApp(); setMenuMovil(false); }}><Icon name="share" />Compartir enlace</button>
          </div>

          <hr className="mobile-drawer-divider" />

          {/* Categorías y Secciones adaptadas con el diseño limpio de Desktop */}
          <div className="mobile-drawer-sections-block">
            <div className="mobile-quick-actions">
              <button
                type="button"
                className="quick-create-pill primary-tint"
                onClick={() => { abrirGestor({ tab: "asignaturas" }); setMenuMovil(false); }}
              >
                <Icon name="plus" size={13} />
                <span>Categoría</span>
              </button>
              <button
                type="button"
                className="quick-create-pill"
                onClick={() => { abrirGestor({ tab: "secciones" }); setMenuMovil(false); }}
              >
                <Icon name="plus" size={13} />
                <span>Sección</span>
              </button>
            </div>

            <div className="mobile-drawer-sections-head">
              <span className="group-title">SECCIONES</span>
              <button
                type="button"
                className="mobile-drawer-manage-btn"
                onClick={() => { abrirGestor({ tab: "secciones" }); setMenuMovil(false); }}
                title="Gestionar secciones y categorías"
                aria-label="Gestionar secciones y categorías"
              >
                <Icon name="sliders" size={14} />
              </button>
            </div>

            <div className="mobile-drawer-sections-tree">
              {categorias.map((cat) => {
                const items = asigApi.asignaturas.filter((a) => (categoriaPorAsignatura[a.id] ?? "general") === cat.id);
                const abierta = cat.abierta ?? true;
                return (
                  <div key={cat.id} className="mobile-section-group">
                    <div className="mobile-section-row">
                      <button
                        type="button"
                        className="mobile-section-toggle"
                        onClick={() => {
                          setCategorias((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, abierta: !c.abierta } : c))
                          );
                        }}
                      >
                        <Icon name={abierta ? "chevron-down" : "chevron-right"} size={13} />
                        <span className="mobile-section-name">{cat.nombre}</span>
                        {items.length > 0 && <span className="mobile-section-count">{items.length}</span>}
                      </button>
                      <button
                        type="button"
                        className="mobile-section-add-btn"
                        onClick={() => {
                          abrirGestor({ tab: "asignaturas", seccionId: cat.id });
                          setMenuMovil(false);
                        }}
                        title={`Añadir categoría en ${cat.nombre}`}
                        aria-label={`Añadir categoría en ${cat.nombre}`}
                      >
                        <Icon name="plus" size={12} />
                      </button>
                    </div>

                    {abierta && (
                      <div className="mobile-sub-list">
                        {items.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className={`mobile-sub-item${filtros.asignatura === a.id ? " on" : ""}`}
                            onClick={() => {
                              filtros.setAsignatura(filtros.asignatura === a.id ? "todas" : a.id);
                              setSeccion("calendario");
                              setMenuMovil(false);
                            }}
                          >
                            <i className="dot" style={{ background: a.color }} />
                            <span className="sub-name">{a.nombre}</span>
                          </button>
                        ))}
                        {items.length === 0 && (
                          <span className="mobile-empty-sec">Sin categorías</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="mobile-drawer-divider" />

          <div className="mobile-menu-bottom">
            <div className="mobile-drawer-extra">
              <button
                type="button"
                className={`mobile-drawer-sync-row status-${syncState.status}`}
                onClick={syncState.syncNow}
                style={{ width: "100%", textAlign: "left" }}
              >
                <i className={`synced-dot status-${syncState.status}`} />
                <span>{syncLabelMobile}</span>
              </button>
              <div className="mobile-drawer-theme-row">
                <span className="mobile-drawer-theme-label">Tema</span>
                <div className="theme-pill" aria-label="Apariencia">
                  <button type="button" aria-label="Modo claro" className={tema === "claro" ? "on" : ""} onClick={() => setTema("claro")}><Icon name="sun" size={14} /><span>Claro</span></button>
                  <button type="button" aria-label="Modo oscuro" className={tema === "oscuro" ? "on" : ""} onClick={() => setTema("oscuro")}><Icon name="moon" size={14} /><span>Oscuro</span></button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="mobile-profile-card"
              onClick={() => {
                abrirPerfil();
                setMenuMovil(false);
              }}
              title="Ver y editar tu perfil"
              aria-label="Editar perfil"
            >
              <span className="user-avatar" style={{ background: perfil.color }}>{obtenerIniciales(perfil.nombre, perfil.email)}</span>
              <div className="mobile-profile-card-info">
                <div className="user-name-row">
                  <strong>{perfil.nombre.trim() || perfil.email.split("@")[0] || "Usuario"}</strong>
                  <span className="user-course-badge">{/^(CFGS|Mi curso)/i.test(perfil.curso.trim()) ? "Personal" : (perfil.curso.trim() || "Personal")}</span>
                </div>
                <small>{perfil.email || "Mi cuenta"}</small>
              </div>
              <span className="mobile-profile-edit-badge" aria-hidden="true">
                <Icon name="pencil" size={14} />
              </span>
            </button>
            <button type="button" className="mobile-logout" onClick={() => void salir()}><Icon name="logout" />Cerrar sesión</button>
          </div>
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
      <CategoriesModal
        abierto={modalCategorias}
        onCerrar={() => setModalCategorias(false)}
        asignaturas={asigApi.asignaturas}
        categorias={categorias}
        categoriaPorAsignatura={categoriaPorAsignatura}
        onAdd={asigApi.add}
        onUpdate={asigApi.update}
        onRemove={asigApi.remove}
        onAsignarCategoria={(asignaturaId, categoriaId) =>
          setCategoriaPorAsignatura((actual) => ({ ...actual, [asignaturaId]: categoriaId }))
        }
        seccionInicialId={seccionInicialCat}
        editarAsignaturaId={categoriaEditarId}
      />

      <SectionsModal
        abierto={modalSecciones}
        onCerrar={() => setModalSecciones(false)}
        categorias={categorias}
        asignaturas={asigApi.asignaturas}
        categoriaPorAsignatura={categoriaPorAsignatura}
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
        editarSeccionId={seccionEditarId}
      />

      <Dialog abierto={editandoPerfil} titulo="Tu perfil" onCerrar={() => setEditandoPerfil(false)}>
        <form
          className="profile-edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            const n = nombrePerfil.trim();
            const c = cursoPerfil.trim();
            setPerfil((actual) => ({ ...actual, nombre: n, curso: c, color: colorPerfil }));
            setToast({ mensaje: "Perfil actualizado.", tipo: "exito" });
            setEditandoPerfil(false);
          }}
        >
          <div className="profile-edit-preview">
            <span className="user-avatar large" style={{ background: colorPerfil }}>
              {obtenerIniciales(nombrePerfil, perfil.email)}
            </span>
            <div>
              <strong>{nombrePerfil.trim() || perfil.email.split("@")[0] || "Usuario"}</strong>
              <small>{perfil.email || "Mi cuenta"}</small>
            </div>
          </div>
          <label>
            <span>Nombre visible</span>
            <input
              value={nombrePerfil}
              onChange={(e) => setNombrePerfil(e.target.value)}
              placeholder="Ej. Matheus"
              autoFocus
            />
          </label>
          <label>
            <span>Rol, equipo o etiqueta (se muestra como badge)</span>
            <input
              value={cursoPerfil}
              onChange={(e) => setCursoPerfil(e.target.value)}
              placeholder="Ej. Personal, Trabajo, Freelance…"
            />
          </label>
          <div className="profile-color-picker">
            <span>Color de perfil</span>
            <ColorPalettePicker value={colorPerfil} onChange={setColorPerfil} ariaLabel="Color de perfil" />
          </div>
          <div className="profile-form-actions">
            <button type="button" className="secondary" onClick={() => setEditandoPerfil(false)}>
              Cancelar
            </button>
            <button type="submit" className="primary">
              Guardar cambios
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
