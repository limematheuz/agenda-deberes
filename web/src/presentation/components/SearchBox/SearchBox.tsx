import { useEffect, useRef, useState } from "react";
import { Icon } from "../Icon/Icon";
import "./SearchBox.css";

interface Props { value: string; onChange: (s: string) => void }

export function SearchBox({ value, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const expandido = abierto || Boolean(value);

  useEffect(() => {
    const f = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto(true);
        window.setTimeout(() => ref.current?.focus(), 10);
      } else if (e.key === "Escape" && expandido && !value) {
        setAbierto(false);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [expandido, value]);

  if (!expandido) {
    return (
      <button
        type="button"
        className="search-compact-btn"
        aria-label="Buscar tareas"
        title="Buscar tareas (⌘K)"
        onClick={() => {
          setAbierto(true);
          window.setTimeout(() => ref.current?.focus(), 10);
        }}
      >
        <Icon name="search" size={17} />
      </button>
    );
  }

  return (
    <label className="search expanded">
      <Icon name="search" size={16} />
      <input
        ref={ref}
        placeholder="Filtrar tareas…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => { if (!value.trim()) setAbierto(false); }}
        autoFocus
      />
      <button
        type="button"
        className="search-clear-btn"
        aria-label="Cerrar búsqueda"
        onClick={(e) => {
          e.preventDefault();
          onChange("");
          setAbierto(false);
        }}
      >
        <Icon name="x" size={14} />
      </button>
    </label>
  );
}
