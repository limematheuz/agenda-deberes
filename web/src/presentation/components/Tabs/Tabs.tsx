import { useEffect, useState } from "react";
import { TIPOS, type TipoTarea } from "../../../domain/entities";
import type { Filtro } from "../../../domain/agenda";
import "./Tabs.css";

interface Props { value: Filtro; onChange: (f: Filtro) => void }
interface Preferencias { visibles: TipoTarea[]; etiquetas: Partial<Record<TipoTarea, string>> }

const CLAVE = "agenda-filtros";
const porDefecto = (): Preferencias => ({ visibles: TIPOS.map((tipo) => tipo.value), etiquetas: {} });
const leer = (): Preferencias => {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) ?? "") as Partial<Preferencias>;
    const validas = new Set(TIPOS.map((tipo) => tipo.value));
    return { visibles: (valor.visibles ?? []).filter((tipo): tipo is TipoTarea => validas.has(tipo)), etiquetas: valor.etiquetas ?? {} };
  } catch { return porDefecto(); }
};

export function Tabs({ value, onChange }: Props) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leer);
  const [configurando, setConfigurando] = useState(false);
  useEffect(() => { localStorage.setItem(CLAVE, JSON.stringify(preferencias)); }, [preferencias]);
  const opciones: ReadonlyArray<{ value: Filtro; label: string }> = [{ value: "todos", label: "Todos" }, ...TIPOS.filter((tipo) => preferencias.visibles.includes(tipo.value)).map((tipo) => ({ value: tipo.value, label: preferencias.etiquetas[tipo.value]?.trim() || tipo.label }))];
  const alternar = (tipo: TipoTarea): void => setPreferencias((actual) => {
    const visibles = actual.visibles.includes(tipo) ? actual.visibles.filter((valor) => valor !== tipo) : [...actual.visibles, tipo];
    if (value === tipo && !visibles.includes(tipo)) onChange("todos");
    return { ...actual, visibles };
  });
  const cambiarEtiqueta = (tipo: TipoTarea, etiqueta: string): void => setPreferencias((actual) => ({ ...actual, etiquetas: { ...actual.etiquetas, [tipo]: etiqueta } }));

  return (
    <div className="tabs-wrap">
      <div className="tabs" role="tablist" aria-label="Filtrar por tipo">
        {opciones.map((opcion) => <button key={opcion.value} role="tab" aria-selected={value === opcion.value} className={value === opcion.value ? "on" : ""} onClick={() => onChange(opcion.value)}>{opcion.label}</button>)}
        <button type="button" className="tabs-edit" onClick={() => setConfigurando((abierto) => !abierto)} aria-expanded={configurando}>Editar</button>
      </div>
      {configurando && <section className="tabs-editor" aria-label="Personalizar filtros">
        <header><strong>Personaliza tus filtros</strong><button type="button" onClick={() => setConfigurando(false)} aria-label="Cerrar">×</button></header>
        <p>Elige qué etiquetas ver y cómo quieres llamarlas.</p>
        {TIPOS.map((tipo) => <label key={tipo.value}><input type="checkbox" checked={preferencias.visibles.includes(tipo.value)} onChange={() => alternar(tipo.value)} /><input value={preferencias.etiquetas[tipo.value] ?? tipo.label} onChange={(e) => cambiarEtiqueta(tipo.value, e.target.value)} aria-label={`Nombre para ${tipo.label}`} /></label>)}
        <button type="button" className="tabs-reset" onClick={() => setPreferencias(porDefecto())}>Restablecer</button>
      </section>}
    </div>
  );
}
