import { useEffect, useState } from "react";
import "./ColorPalettePicker.css";

export const COLORES_PALETA_BASE = [
  "#eab308",
  "#3b82f6",
  "#10b981",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#64748b",
] as const;

const CUSTOM_COLORS_KEY = "agenda-colores-notas-custom";
const CUSTOM_COLORS_EVENT = "calendarappio-colors-updated";

function leerColoresExtra(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_COLORS_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

interface Props {
  value: string;
  onChange: (color: string) => void;
  ariaLabel?: string;
  compact?: boolean;
}

export function ColorPalettePicker({ value, onChange, ariaLabel = "Selector de color", compact = false }: Props) {
  const [coloresExtra, setColoresExtra] = useState<string[]>(leerColoresExtra);
  const [colorPersonalizado, setColorPersonalizado] = useState(value || "#6366f1");

  useEffect(() => {
    const handler = () => setColoresExtra(leerColoresExtra());
    window.addEventListener(CUSTOM_COLORS_EVENT, handler);
    return () => window.removeEventListener(CUSTOM_COLORS_EVENT, handler);
  }, []);

  const paleta = [...COLORES_PALETA_BASE, ...coloresExtra];
  const valorNorm = (value || "").toLowerCase();
  const estaEnPaleta = paleta.some((c) => c.toLowerCase() === valorNorm);
  const listaVisible = estaEnPaleta || !value ? paleta : [...paleta, value];

  const anadirColorPersonalizado = (nuevoColor: string): void => {
    const hex = nuevoColor.toLowerCase();
    if (!paleta.some((c) => c.toLowerCase() === hex)) {
      const siguiente = [...coloresExtra, hex];
      setColoresExtra(siguiente);
      try {
        localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(siguiente));
        window.dispatchEvent(new CustomEvent(CUSTOM_COLORS_EVENT));
      } catch {
        // Ignorar errores de almacenamiento
      }
    }
    onChange(hex);
  };

  return (
    <div className={`color-palette-picker${compact ? " compact" : ""}`} role="radiogroup" aria-label={ariaLabel}>
      {listaVisible.map((c) => {
        const activo = c.toLowerCase() === valorNorm;
        return (
          <button
            key={c}
            type="button"
            className={`palette-swatch${activo ? " selected" : ""}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            aria-checked={activo}
            onClick={() => onChange(c)}
          />
        );
      })}
      <label className="palette-add-swatch" title="Añadir otro color personalizado">
        <span>+</span>
        <input
          type="color"
          value={colorPersonalizado}
          onChange={(e) => {
            setColorPersonalizado(e.target.value);
            anadirColorPersonalizado(e.target.value);
          }}
          aria-label="Añadir color personalizado"
        />
      </label>
    </div>
  );
}
