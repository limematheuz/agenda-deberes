import { useState } from "react";
import type { Tarea } from "../../../domain/entities";
import { describeDays, urgencyOf } from "../../../domain/urgency";
import type { EstadoPush } from "../../../domain/ports";
import { Icon } from "../Icon/Icon";
import "./NotificationPanel.css";
import "./NotificationPanel.badge.css";

export function NotificationPanel({ tareas, estado, onActivate, onSelect }: { tareas: readonly Tarea[]; estado: EstadoPush; onActivate: () => void; onSelect: (t: Tarea) => void }) {
  const [open, setOpen] = useState(false); const [tab, setTab] = useState<"ahora" | "proximas" | "planificadas">("ahora");
  const groups = { ahora: tareas.filter((t) => !t.hecha && urgencyOf(t) === "alta"), proximas: tareas.filter((t) => !t.hecha && urgencyOf(t) === "media"), planificadas: tareas.filter((t) => !t.hecha && urgencyOf(t) === "baja") };
  const labels = { ahora: "Prioridad", proximas: "Esta semana", planificadas: "Planificadas" };
  return <div className="notifications"><button className="notifications-trigger" onClick={() => setOpen((v) => !v)} aria-label="Abrir centro de avisos" aria-expanded={open}><Icon name="bell" size={20} />{groups.ahora.length > 0 && <i>{groups.ahora.length}</i>}</button>{open && <><button className="notifications-dismiss" onClick={() => setOpen(false)} aria-label="Cerrar centro de avisos" /><section className="notifications-panel"><header><strong>Centro de avisos</strong>{estado !== "activo" && <button onClick={onActivate}><Icon name="bell" size={14} />Activar avisos</button>}</header><div className="notification-tabs">{(Object.keys(labels) as Array<keyof typeof labels>).map((key) => <button key={key} className={tab === key ? "on" : ""} onClick={() => setTab(key)}>{labels[key]}<small>{groups[key].length}</small></button>)}</div><ul>{groups[tab].slice(0, 6).map((t) => <li key={t.id}><button onClick={() => { onSelect(t); setOpen(false); }}><b>{t.titulo}</b><span>{describeDays(t.fecha)}</span></button></li>)}{groups[tab].length === 0 && <li className="none">No hay avisos en esta categoría.</li>}</ul></section></>}</div>;
}
