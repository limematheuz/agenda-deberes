import { useMemo } from "react";
import "./TimePicker.css";

interface Props { value: string; abierto: boolean; onToggle: () => void }

const MINUTOS = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

/** Selector de hora propio: evita el menú nativo desigual entre navegadores. */
export function TimePicker({ value, abierto, onToggle }: Props) {
  return (
    <div className="time-picker">
      <button type="button" className="time-trigger" onClick={onToggle} aria-expanded={abierto} aria-haspopup="dialog">
        <span>Hora</span><b>{value || "--:--"}</b><i aria-hidden="true">⌄</i>
      </button>
    </div>
  );
}

export function TimePickerPanel({ value, onChange, onClose }: { value: string; onChange: (value: string) => void; onClose: () => void }) {
  const [hora, minuto] = useMemo(() => value ? value.split(":") : ["", ""], [value]);
  const elegirHora = (h: string): void => onChange(`${h}:${minuto || "00"}`);
  const elegirMinuto = (m: string): void => { onChange(`${hora || "09"}:${m}`); onClose(); };
  return <div className="time-popover" role="dialog" aria-label="Elegir hora"><div className="time-panel-heading"><span>Selecciona una hora</span><button type="button" onClick={onClose} aria-label="Cerrar selector">×</button></div><div className="time-columns"><div role="listbox" aria-label="Horas">{Array.from({ length: 24 }, (_, n) => String(n).padStart(2, "0")).map((h) => <button key={h} type="button" role="option" aria-selected={hora === h} className={hora === h ? "selected" : ""} onClick={() => elegirHora(h)}>{h}</button>)}</div><div role="listbox" aria-label="Minutos">{MINUTOS.map((m) => <button key={m} type="button" role="option" aria-selected={minuto === m} className={minuto === m ? "selected" : ""} onClick={() => elegirMinuto(m)}>{m}</button>)}</div></div><button type="button" className="time-clear" onClick={() => { onChange(""); onClose(); }}>Sin hora</button></div>;
}
