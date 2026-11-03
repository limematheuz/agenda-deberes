import { useEffect, useState } from "react";
import { TIPOS, type TipoTarea } from "../../../domain/entities";
import type { Filtro } from "../../../domain/agenda";
import { Icon } from "../Icon/Icon";
import "./Tabs.css";

interface Props { value: Filtro; onChange: (f: Filtro) => void }
interface TagExtra { value: TipoTarea; label: string; color: string }
interface Preferencias { visibles: TipoTarea[]; etiquetas: Partial<Record<TipoTarea, string>>; colores: Partial<Record<TipoTarea, string>>; extras: TagExtra[]; orden: TipoTarea[] }

const CLAVE = "agenda-filtros";
const COLORES: Record<TipoTarea, string> = { ejercicio: "#0a84ff", examen: "#ff453a", practica: "#30b46b", otro: "#af52de" };
function ColorSwatch({ color, onChange, label }: { color: string; onChange: (color: string) => void; label: string }) {
  return <label className="color-swatch" title={label}><input type="color" value={color} onChange={(e) => onChange(e.target.value)} aria-label={label} /><span style={{ background: color }} /></label>;
}
const porDefecto = (): Preferencias => ({ visibles: TIPOS.map((tipo) => tipo.value), etiquetas: {}, colores: {}, extras: [], orden: TIPOS.map((tipo) => tipo.value) });
export const tiposPersonalizados = (): ReadonlyArray<{ value: TipoTarea; label: string; color?: string }> => {
  try { const valor = JSON.parse(localStorage.getItem(CLAVE) ?? "") as Partial<Preferencias>; return [...TIPOS.map((tipo) => ({ ...tipo, color: valor.colores?.[tipo.value] ?? COLORES[tipo.value] })), ...(valor.extras ?? [])]; } catch { return TIPOS; }
};
const leer = (): Preferencias => {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) ?? "") as Partial<Preferencias>;
    const extras = (valor.extras ?? []).filter((tag): tag is TagExtra => Boolean(tag?.value && tag?.label && tag?.color));
    const validas = new Set([...TIPOS.map((tipo) => tipo.value), ...extras.map((tag) => tag.value)]);
    const ordenGuardado = (valor.orden ?? []).filter((tipo): tipo is TipoTarea => validas.has(tipo));
    const orden = [...ordenGuardado, ...TIPOS.map((tipo) => tipo.value).filter((tipo) => !ordenGuardado.includes(tipo))];
    return { visibles: (valor.visibles ?? TIPOS.map((tipo) => tipo.value)).filter((tipo): tipo is TipoTarea => validas.has(tipo)), etiquetas: valor.etiquetas ?? {}, colores: valor.colores ?? {}, extras, orden };
  } catch { return porDefecto(); }
};

export function Tabs({ value, onChange }: Props) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leer);
  const [configurando, setConfigurando] = useState(false);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState("");
  useEffect(() => { localStorage.setItem(CLAVE, JSON.stringify(preferencias)); }, [preferencias]);
  useEffect(() => { TIPOS.forEach((tipo) => document.documentElement.style.setProperty(`--tag-${tipo.value}`, preferencias.colores[tipo.value] ?? COLORES[tipo.value])); }, [preferencias.colores]);
  const definiciones = [...TIPOS, ...preferencias.extras.map((tag) => ({ value: tag.value, label: tag.label }))];
  const tiposOrdenados = preferencias.orden.map((valor) => definiciones.find((tipo) => tipo.value === valor)).filter((tipo): tipo is { value: TipoTarea; label: string } => Boolean(tipo));
  const opciones: ReadonlyArray<{ value: Filtro; label: string }> = [{ value: "todos", label: "Todos" }, ...tiposOrdenados.filter((tipo) => preferencias.visibles.includes(tipo.value)).map((tipo) => ({ value: tipo.value, label: preferencias.etiquetas[tipo.value]?.trim() || tipo.label }))];
  const alternar = (tipo: TipoTarea): void => setPreferencias((actual) => {
    const visibles = actual.visibles.includes(tipo) ? actual.visibles.filter((valor) => valor !== tipo) : [...actual.visibles, tipo];
    if (value === tipo && !visibles.includes(tipo)) onChange("todos");
    return { ...actual, visibles };
  });
  const cambiarEtiqueta = (tipo: TipoTarea, etiqueta: string): void => setPreferencias((actual) => ({ ...actual, etiquetas: { ...actual.etiquetas, [tipo]: etiqueta } }));
  const cambiarColor = (tipo: TipoTarea, color: string): void => setPreferencias((actual) => ({ ...actual, colores: { ...actual.colores, [tipo]: color } }));
  const mover = (origen: TipoTarea, destino: TipoTarea): void => setPreferencias((actual) => {
    if (origen === destino) return actual;
    const orden = actual.orden.filter((tipo) => tipo !== origen);
    orden.splice(orden.indexOf(destino), 0, origen);
    return { ...actual, orden };
  });
  const borrar = (tipo: TipoTarea): void => setPreferencias((actual) => { if (value === tipo) onChange("todos"); return { ...actual, extras: actual.extras.filter((tag) => tag.value !== tipo), visibles: actual.visibles.filter((tag) => tag !== tipo), orden: actual.orden.filter((tag) => tag !== tipo) }; });
  const crear = (): void => { const etiqueta = nuevaEtiqueta.trim(); if (!etiqueta) return; const tipo = `etiqueta-${Date.now()}`; setPreferencias((actual) => ({ ...actual, extras: [...actual.extras, { value: tipo, label: etiqueta, color: "#0a84ff" }], visibles: [...actual.visibles, tipo], orden: [...actual.orden, tipo], etiquetas: { ...actual.etiquetas, [tipo]: etiqueta }, colores: { ...actual.colores, [tipo]: "#0a84ff" } })); setNuevaEtiqueta(""); };
  const usarSelectorMovil = opciones.length > 4;

  return (
    <div className={`tabs-wrap${usarSelectorMovil ? " has-mobile-select" : ""}`}>
      <div className="tabs" role="tablist" aria-label="Filtrar por tipo">
        {opciones.map((opcion) => <button key={opcion.value} role="tab" aria-selected={value === opcion.value} className={value === opcion.value ? "on" : ""} onClick={() => onChange(opcion.value)}>{opcion.label}</button>)}
      </div>
      {usarSelectorMovil && <select className="tabs-mobile-select" value={value} onChange={(e) => onChange(e.target.value as Filtro)} aria-label="Filtrar por tipo">{opciones.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select>}
      <button type="button" className="tabs-config" onClick={() => setConfigurando((abierto) => !abierto)} aria-label="Personalizar filtros" aria-expanded={configurando}><Icon name="sliders" size={16} /><span>Personalizar</span></button>
      {configurando && <><button className="tabs-editor-dismiss" onClick={() => setConfigurando(false)} aria-label="Cerrar personalización" /><section className="tabs-editor" aria-label="Personalizar filtros">
        <header><strong>Personaliza tus filtros</strong><button type="button" onClick={() => setConfigurando(false)} aria-label="Cerrar">×</button></header>
        <p>Arrastra para ordenar; muestra, oculta, renombra y cambia el color de cada etiqueta.</p>
        <div className="tabs-editor-list">{tiposOrdenados.map((tipo) => { const color = preferencias.colores[tipo.value] ?? preferencias.extras.find((tag) => tag.value === tipo.value)?.color ?? COLORES[tipo.value] ?? "#0a84ff"; return <div key={tipo.value} className="tabs-editor-row" draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-agenda-tag", tipo.value); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const origen = e.dataTransfer.getData("application/x-agenda-tag") as TipoTarea; if (origen) mover(origen, tipo.value); }}><span className="tabs-drag-handle" aria-label={`Arrastrar ${tipo.label}`}>⠿</span><input type="checkbox" checked={preferencias.visibles.includes(tipo.value)} onChange={() => alternar(tipo.value)} aria-label={`Mostrar ${tipo.label}`} /><input value={preferencias.etiquetas[tipo.value] ?? tipo.label} onChange={(e) => cambiarEtiqueta(tipo.value, e.target.value)} aria-label={`Nombre para ${tipo.label}`} /><ColorSwatch color={color} onChange={(nuevo) => cambiarColor(tipo.value, nuevo)} label={`Color para ${tipo.label}`} />{preferencias.extras.some((tag) => tag.value === tipo.value) && <button type="button" className="tag-remove" onClick={() => borrar(tipo.value)} aria-label={`Borrar ${tipo.label}`}>×</button>}</div>; })}</div>
        <form className="tabs-new" onSubmit={(e) => { e.preventDefault(); crear(); }}><input value={nuevaEtiqueta} onChange={(e) => setNuevaEtiqueta(e.target.value)} placeholder="Nueva etiqueta" aria-label="Nueva etiqueta" /><button type="submit">Añadir</button></form>
        <button type="button" className="tabs-reset" onClick={() => setPreferencias(porDefecto())}>Restablecer</button>
      </section></>}
    </div>
  );
}
