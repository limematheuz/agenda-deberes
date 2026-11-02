import { useEffect, useMemo, useState } from "react";
import { formatLong, todayISO } from "../../domain/dates";
import { tipoLabel, type ISODate } from "../../domain/entities";
import { describeDays } from "../../domain/urgency";
import { CalendarHeader } from "../components/CalendarHeader/CalendarHeader";
import { DayPanel } from "../components/DayPanel/DayPanel";
import { Dialog } from "../components/Dialog/Dialog";
import { Icon } from "../components/Icon/Icon";
import { MonthView } from "../components/MonthView/MonthView";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { SubjectsManager } from "../components/SubjectsManager/SubjectsManager";
import { Toolbar } from "../components/Toolbar/Toolbar";
import { UrgencyBanner } from "../components/UrgencyBanner/UrgencyBanner";
import { WeekView } from "../components/WeekView/WeekView";
import { useAsignaturas } from "../hooks/useAsignaturas";
import { useCalendarView } from "../hooks/useCalendarView";
import { usePush } from "../hooks/usePush";
import { useTareas } from "../hooks/useTareas";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useUrgencyBadge } from "../hooks/useUrgencyBadge";
import { useServices } from "../ServicesContext";
import "./CalendarPage.css";

export function CalendarPage() {
  const { auth } = useServices();
  const tareasApi = useTareas();
  const asigApi = useAsignaturas();
  const push = usePush();
  const cal = useCalendarView();
  const mapa = useMemo(() => new Map(asigApi.asignaturas.map((a) => [a.id, a] as const)), [asigApi.asignaturas]);
  const filtros = useTaskFilters(tareasApi.tareas, mapa);
  const [dia, setDia] = useState<ISODate | null>(null);
  const [verAsig, setVerAsig] = useState(false);
  const [seccion, setSeccion] = useState<"resumen" | "buscar" | "calendario">("calendario");
  const [barraContraida, setBarraContraida] = useState(false);
  const [tema, setTema] = useState<"claro" | "oscuro">(() => localStorage.getItem("agenda-tema") === "oscuro" ? "oscuro" : "claro");
  const [asignaturaInicial, setAsignaturaInicial] = useState<string | null>(null);

  useEffect(() => { document.documentElement.dataset.theme = tema; localStorage.setItem("agenda-tema", tema); }, [tema]);

  useUrgencyBadge(tareasApi.tareas);

  const salir = (): void => void auth.signOut();
  const error = tareasApi.error ?? asigApi.error ?? push.error;
  const abrirDia = (fecha: ISODate, asignaturaId: string | null = null): void => { setAsignaturaInicial(asignaturaId); setDia(fecha); };

  return (
    <div className={`app ${tema === "oscuro" ? "dark" : ""}`}>
      <div className={barraContraida ? "app-shell collapsed" : "app-shell"}>
      <Sidebar asignaturas={asigApi.asignaturas} tareas={tareasApi.tareas} activa={filtros.asignatura} onElegir={(id) => { filtros.setAsignatura(id); setSeccion("calendario"); }} onGestionar={() => setVerAsig(true)} onSalir={salir} seccion={seccion} onSeccion={setSeccion} contraida={barraContraida} onAlternar={() => setBarraContraida((v) => !v)} />
      <main className="main">
        <div className="crumbs">
          <span>Agenda de deberes</span><Icon name="chevron-right" size={14} /><b>{seccion === "resumen" ? "Resumen" : seccion === "buscar" ? "Buscar" : "Calendario"}</b><div className="theme-pill" aria-label="Apariencia"><button className={tema === "claro" ? "on" : ""} onClick={() => setTema("claro")}><Icon name="sun" size={14} /><span>Claro</span></button><button className={tema === "oscuro" ? "on" : ""} onClick={() => setTema("oscuro")}><Icon name="moon" size={14} /><span>Oscuro</span></button></div>
          <div className="mobile-actions">
            <button className="icon-btn" onClick={() => setVerAsig(true)} aria-label="Asignaturas"><Icon name="book" /></button>
            <button className="icon-btn" onClick={salir} aria-label="Salir"><Icon name="logout" /></button>
          </div>
        </div>
        <div className="page-title"><h1>{seccion === "resumen" ? "Resumen" : seccion === "buscar" ? "Buscar deberes" : "Calendario"}</h1><div className="page-tools"><span className="synced">Tus tareas se guardan automáticamente</span>{push.estado === "inactivo" && <button className="push-cta" onClick={() => void push.activar()}><Icon name="bell" size={15} />Activar avisos</button>}</div></div>
        <nav className="mobile-section-nav" aria-label="Secciones">
          <button className={seccion === "resumen" ? "on" : ""} onClick={() => setSeccion("resumen")}>Resumen</button>
          <button className={seccion === "buscar" ? "on" : ""} onClick={() => setSeccion("buscar")}>Buscar</button>
          <button className={seccion === "calendario" ? "on" : ""} onClick={() => setSeccion("calendario")}>Calendario</button>
        </nav>

        {error && <p role="alert" className="error">{error}</p>}

        {seccion === "resumen" ? (
          <section className="overview" aria-label="Resumen de deberes">
            <div className="summary-cards"><article><span>Por hacer</span><strong>{tareasApi.tareas.filter((t) => !t.hecha).length}</strong></article><article><span>Completados</span><strong>{tareasApi.tareas.filter((t) => t.hecha).length}</strong></article><article><span>Asignaturas</span><strong>{asigApi.asignaturas.length}</strong></article></div>
            <div className="upcoming"><h2>Próximos deberes</h2>{tareasApi.tareas.filter((t) => !t.hecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8).map((t) => <button key={t.id} onClick={() => { cal.setAncla(t.fecha); setSeccion("calendario"); }}><i style={{ background: t.asignaturaId ? mapa.get(t.asignaturaId)?.color : "#98a2b3" }} /><span><b>{t.titulo}</b><small>{tipoLabel(t.tipo)} · {describeDays(t.fecha)}</small></span><span>{t.hora?.slice(0, 5) ?? "Todo el día"}</span></button>)}{tareasApi.tareas.every((t) => t.hecha) && <p className="muted">No tienes deberes pendientes.</p>}</div>
          </section>
        ) : <>
          <Toolbar tipo={filtros.tipo} onTipo={filtros.setTipo} asignatura={filtros.asignatura} onAsignatura={filtros.setAsignatura} asignaturas={asigApi.asignaturas} texto={filtros.texto} onTexto={filtros.setTexto} />
          {seccion === "buscar" ? <section className="search-results"><h2>Resultados</h2>{filtros.visibles.map((t) => <button key={t.id} onClick={() => { cal.setAncla(t.fecha); abrirDia(t.fecha); }}><span><b>{t.titulo}</b><small>{tipoLabel(t.tipo)} · {describeDays(t.fecha)}</small></span><span>{t.hora?.slice(0, 5) ?? "Todo el día"}</span></button>)}{filtros.visibles.length === 0 && <p className="muted">No hay deberes que coincidan con la búsqueda.</p>}</section> : <section className="cal">
            <CalendarHeader titulo={cal.titulo} inicio={cal.inicio} fin={cal.fin} vista={cal.vista} onVista={cal.setVista} onMover={cal.mover} onHoy={cal.irAHoy} onAnadir={() => abrirDia(todayISO())} />
            {cal.vista === "mes"
              ? <MonthView year={cal.year} month={cal.month} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={abrirDia} />
              : <WeekView inicio={cal.inicio} dias={cal.vista === "dia" ? 1 : 7} tareas={filtros.visibles} asignaturas={mapa} onSelectDay={abrirDia} onToggle={tareasApi.toggle} onDropSubject={abrirDia} />}
          </section>}
        </>}
        <UrgencyBanner tareas={tareasApi.tareas} estado={push.estado} onSelect={(f) => { cal.setAncla(f); abrirDia(f); }} />
      </main>
      </div>

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
      <Dialog abierto={verAsig} titulo="Asignaturas" onCerrar={() => setVerAsig(false)}>
        <SubjectsManager asignaturas={asigApi.asignaturas} onAdd={asigApi.add} onRemove={asigApi.remove} />
      </Dialog>
    </div>
  );
}
