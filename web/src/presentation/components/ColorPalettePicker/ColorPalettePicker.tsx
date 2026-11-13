import { useEffect, useState } from "react";
import { Icon } from "../Icon/Icon";
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
const MAX_CUSTOM_COLORS = 6;
const DISTANCIA_MINIMA_COLOR = 26; // Evita generar círculos casi idénticos por arrastre

function normalizarHex(hex: string): string | null {
  const limpio = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(limpio)) return limpio;
  if (/^#[0-9a-f]{3}$/i.test(limpio)) {
    return `#${limpio[1]}${limpio[1]}${limpio[2]}${limpio[2]}${limpio[3]}${limpio[3]}`;
  }
  return null;
}

function distanciaRGB(hex1: string, hex2: string): number {
  const h1 = normalizarHex(hex1);
  const h2 = normalizarHex(hex2);
  if (!h1 || !h2) return 999;

  const r1 = parseInt(h1.slice(1, 3), 16);
  const g1 = parseInt(h1.slice(3, 5), 16);
  const b1 = parseInt(h1.slice(5, 7), 16);

  const r2 = parseInt(h2.slice(1, 3), 16);
  const g2 = parseInt(h2.slice(3, 5), 16);
  const b2 = parseInt(h2.slice(5, 7), 16);

  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

function leerColoresExtra(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_COLORS_KEY) ?? "[]") as string[];
    if (!Array.isArray(raw)) return [];
    const limpios: string[] = [];

    for (const c of raw) {
      if (typeof c === "string") {
        const hex = normalizarHex(c);
        if (!hex) continue;

        // Descartar si coincide o es indistinguible de la paleta base
        const esCercanoABase = COLORES_PALETA_BASE.some(
          (base) => distanciaRGB(hex, base) < DISTANCIA_MINIMA_COLOR
        );
        if (esCercanoABase) continue;

        // Descartar si es indistinguible de uno ya guardado (elimina estelas de arrastre)
        const yaExisteCercano = limpios.some(
          (guardado) => distanciaRGB(hex, guardado) < DISTANCIA_MINIMA_COLOR
        );
        if (!yaExisteCercano) {
          limpios.push(hex);
        }
      }
    }

    const recortados = limpios.slice(-MAX_CUSTOM_COLORS);
    if (recortados.length !== raw.length) {
      localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(recortados));
    }
    return recortados;
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

  // Mantener el color del input sincronizado cuando cambie externamente
  useEffect(() => {
    if (value && /^#[0-9a-f]{3,6}$/i.test(value)) {
      setColorPersonalizado(value);
    }
  }, [value]);

  const valorNorm = (value || "").toLowerCase();

  const guardarEnStorage = (colores: string[]) => {
    try {
      localStorage.setItem(CUSTOM_COLORS_KEY, JSON.stringify(colores));
      window.dispatchEvent(new CustomEvent(CUSTOM_COLORS_EVENT));
    } catch {
      // Ignorar errores de almacenamiento
    }
  };

  /**
   * Solo comitear cuando el usuario termina la selección (al cerrar/desenfocar el selector nativo).
   * NUNCA durante arrastre (onInput / onChange / mousemove) para evitar crear múltiples círculos.
   */
  const commitearColorFinal = (candidato: string): void => {
    const hex = normalizarHex(candidato);
    if (!hex) return;

    // Si coincide o es muy cercano a un color base, no crear círculo extra
    const esCercanoABase = COLORES_PALETA_BASE.some(
      (base) => distanciaRGB(hex, base) < DISTANCIA_MINIMA_COLOR
    );
    if (esCercanoABase) return;

    setColoresExtra((actuales) => {
      // Si ya hay un color igual o casi idéntico, no duplicar
      const yaExiste = actuales.some((c) => distanciaRGB(hex, c) < DISTANCIA_MINIMA_COLOR);
      if (yaExiste) return actuales;

      const siguiente = [...actuales, hex].slice(-MAX_CUSTOM_COLORS);
      guardarEnStorage(siguiente);
      return siguiente;
    });
  };

  // Durante el arrastre del cursor por el panel, SOLO actualizar la vista previa en tiempo real
  // SIN modificar `coloresExtra` ni crear ningún círculo nuevo.
  const manejarMovimientoColor = (hexRaw: string): void => {
    const hex = hexRaw.toLowerCase();
    setColorPersonalizado(hex);
    onChange(hex);
  };

  const eliminarColorPersonalizado = (colorABorrar: string, e?: React.MouseEvent): void => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const hex = colorABorrar.toLowerCase();
    const siguiente = coloresExtra.filter((c) => c.toLowerCase() !== hex);
    setColoresExtra(siguiente);
    guardarEnStorage(siguiente);

    if (value.toLowerCase() === hex) {
      onChange(COLORES_PALETA_BASE[0]);
    }
  };

  const borrarTodosPersonalizados = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setColoresExtra([]);
    guardarEnStorage([]);
    const baseSet = new Set(COLORES_PALETA_BASE.map((b) => b.toLowerCase()));
    if (!baseSet.has(value.toLowerCase())) {
      onChange(COLORES_PALETA_BASE[0]);
    }
  };

  return (
    <div className={`color-palette-picker${compact ? " compact" : ""}`} role="radiogroup" aria-label={ariaLabel}>
      {/* 1. Colores base estándar (inmutables) */}
      {COLORES_PALETA_BASE.map((c) => {
        const activo = c.toLowerCase() === valorNorm;
        return (
          <button
            key={c}
            type="button"
            className={`palette-swatch${activo ? " selected" : ""}`}
            style={{ background: c }}
            aria-label={`Color base ${c}`}
            aria-checked={activo}
            onClick={() => onChange(c)}
          />
        );
      })}

      {/* 2. Colores personalizados añadidos por el usuario (con botón de eliminar) */}
      {coloresExtra.map((c) => {
        const activo = c.toLowerCase() === valorNorm;
        return (
          <div key={c} className="palette-custom-swatch-wrap">
            <button
              type="button"
              className={`palette-swatch custom${activo ? " selected" : ""}`}
              style={{ background: c }}
              aria-label={`Color personalizado ${c}`}
              aria-checked={activo}
              onClick={() => onChange(c)}
            />
            <button
              type="button"
              className="palette-swatch-delete"
              title={`Eliminar color ${c}`}
              aria-label={`Eliminar color ${c}`}
              onClick={(e) => eliminarColorPersonalizado(c, e)}
            >
              <Icon name="x" size={10} />
            </button>
          </div>
        );
      })}

      {/* 3. Selector nativo para añadir color (onInput y onChange solo actualizan previsualización, NUNCA crean círculos) */}
      <label className="palette-add-swatch" title="Añadir color personalizado">
        <span>+</span>
        <input
          type="color"
          value={colorPersonalizado}
          onInput={(e) => manejarMovimientoColor(e.currentTarget.value)}
          onChange={(e) => manejarMovimientoColor(e.target.value)}
          onBlur={(e) => commitearColorFinal(e.target.value)}
          aria-label="Añadir color personalizado"
        />
      </label>

      {/* 4. Botón de limpieza si hay colores personalizados */}
      {coloresExtra.length > 0 && (
        <button
          type="button"
          className="palette-clear-all-btn"
          title="Borrar todos los colores personalizados"
          aria-label="Borrar todos los colores personalizados"
          onClick={borrarTodosPersonalizados}
        >
          <Icon name="trash" size={12} />
          <span>Limpiar</span>
        </button>
      )}
    </div>
  );
}
