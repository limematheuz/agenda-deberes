import { useState } from "react";
import { todayISO } from "../../../domain/dates";
import type { Recordatorio, Tarea } from "../../../domain/entities";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import type { EstadoPush } from "../../../domain/ports";
import { Icon } from "../Icon/Icon";
import "./NotificationPanel.css";
import "./NotificationPanel.badge.css";

export function NotificationPanel({
  tareas,
  recordatorios = [],
  estado,
  onActivate,
  onTest,
  onSelect,
  onSelectRecordatorio,
}: {
  tareas: readonly Tarea[];
  recordatorios?: readonly Recordatorio[];
  estado: EstadoPush;
  onActivate: () => void;
  onTest?: () => void;
  onSelect: (t: Tarea) => void;
  onSelectRecordatorio?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ahora" | "proximas" | "planificadas">("ahora");
  const hoy = todayISO();
  const recordatoriosConFecha = recordatorios.filter((r) => !r.hecho && r.fechaAviso !== null);
  const recAhora = recordatoriosConFecha.filter((r) => r.fechaAviso! <= hoy);
  const recProximas = recordatoriosConFecha.filter((r) => r.fechaAviso! > hoy);
  const groups = {
    ahora: tareas.filter((t) => !t.hecha && urgencyOf(t) === "alta"),
    proximas: tareas.filter((t) => !t.hecha && urgencyOf(t) === "media"),
    planificadas: tareas.filter((t) => !t.hecha && urgencyOf(t) === "baja"),
  };
  const totalAhora = groups.ahora.length + recAhora.length;
  const totalSemana = groups.proximas.length + recProximas.length;
  const badgeTotal = totalAhora > 0 ? totalAhora : totalSemana;
  const labels = {
    ahora: { label: "Prioridad", count: totalAhora },
    proximas: { label: "Esta semana", count: totalSemana },
    planificadas: { label: "Planificadas", count: groups.planificadas.length },
  };
  const recsEnTab = tab === "ahora" ? recAhora : tab === "proximas" ? recProximas : [];

  return (
    <div className="notifications">
      <button className="notifications-trigger" onClick={() => setOpen((v) => !v)} aria-label="Abrir centro de avisos" aria-expanded={open}>
        <Icon name="bell" size={20} />
        {badgeTotal > 0 && <i>{badgeTotal}</i>}
      </button>
      {open && (
        <>
          <button className="notifications-dismiss" onClick={() => setOpen(false)} aria-label="Cerrar centro de avisos" />
          <section className="notifications-panel">
            <header>
              <strong>Centro de avisos ({totalAhora} hoy · {totalSemana} semana)</strong>
              {estado === "activo" ? (
                onTest && (
                  <button type="button" onClick={onTest} title="Enviar una notificación de prueba a este dispositivo">
                    <Icon name="bell" size={14} />Probar aviso
                  </button>
                )
              ) : estado === "bloqueado" ? (
                <button type="button" onClick={onActivate} title="Permiso bloqueado en el navegador o sistema">
                  <Icon name="bell" size={14} />Permiso bloqueado
                </button>
              ) : (
                <button type="button" onClick={onActivate}>
                  <Icon name="bell" size={14} />Activar avisos
                </button>
              )}
            </header>
            <div className="notification-tabs">
              {(Object.keys(labels) as Array<keyof typeof labels>).map((key) => (
                <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>
                  {labels[key].label}<small>{labels[key].count}</small>
                </button>
              ))}
            </div>
            <ul>
              {recsEnTab.map((r) => (
                <li key={`rec-${r.id}`}>
                  <button onClick={() => { if (onSelectRecordatorio) onSelectRecordatorio(); setOpen(false); }}>
                    <b>🔔 {r.titulo}</b>
                    <span>{r.fechaAviso ? describeDays(r.fechaAviso) : ""}</span>
                  </button>
                </li>
              ))}
              {groups[tab].slice(0, 6).map((t) => (
                <li key={t.id}>
                  <button onClick={() => { onSelect(t); setOpen(false); }}>
                    <b>{t.titulo}</b>
                    <span>{describeDays(t.fecha)}</span>
                  </button>
                </li>
              ))}
              {groups[tab].length === 0 && recsEnTab.length === 0 && <li className="none">No hay avisos en esta categoría.</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
