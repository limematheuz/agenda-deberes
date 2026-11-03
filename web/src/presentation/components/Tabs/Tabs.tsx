import { useEffect, useState } from "react";
import { TIPOS, type TipoTarea } from "../../../domain/entities";
import type { Filtro } from "../../../domain/agenda";
import { Icon } from "../Icon/Icon";
import "./Tabs.css";

interface Props { value: Filtro; onChange: (f: Filtro) => void }
interface Preferencias { visibles: TipoTarea[]; etiquetas: Partial<Record<TipoTarea, string>>; orden: TipoTarea[] }

const CLAVE = "agenda-filtros";
const porDefecto = (): Preferencias => ({ visibles: TIPOS.map((tipo) => tipo.value), etiquetas: {}, orden: TIPOS.map((tipo) => tipo.value) });
const leer = (): Preferencias => {
  try {
    const valor = JSON.parse(localStorage.getItem(CLAVE) ?? "") as Partial<Preferencias>;
    const validas = new Set(TIPOS.map((tipo) => tipo.value));
    const ordenGuardado = (valor.orden ?? []).filter((tipo): tipo is TipoTarea => validas.has(tipo));
    const orden = [...ordenGuardado, ...TIPOS.map((tipo) => tipo.value).filter((tipo) => !ordenGuardado.includes(tipo))];
    return { visibles: (valor.visibles ?? TIPOS.map((tipo) => tipo.value)).filter((tipo): tipo is TipoTarea => validas.has(tipo)), etiquetas: valor.etiquetas ?? {}, orden };
  } catch { return porDefecto(); }
};

export function Tabs({ value, onChange }: Props) {
  const [preferencias, setPreferencias] = useState<Preferencias>(leer);
  const [configurando, setConfigurando] = useState(false);
  useEffect(() => { localStorage.setItem(CLAVE, JSON.stringify(preferencias)); }, [preferencias]);
  const tiposOrdenados = preferencias.orden.map((valor) => TIPOS.find((tipo) => tipo.value === valor)).filter((tipo): tipo is (typeof TIPOS)[number] => Boolean(tipo));
  const opciones: ReadonlyArray<{ value: Filtro; label: string }> = [{ value: "todos", label: "Todos" }, ...tiposOrdenados.filter((tipo) => preferencias.visibles.includes(tipo.value)).map((tipo) => ({ value: tipo.value, label: preferencias.etiquetas[tipo.value]?.trim() || tipo.label }))];
  const alternar = (tipo: TipoTarea): void => setPreferencias((actual) => {
    const visibles = actual.visibles.includes(tipo) ? actual.visibles.filter((valor) => valor !== tipo) : [...actual.visibles, tipo];
    if (value === tipo && !visibles.includes(tipo)) onChange("todos");
    return { ...actual, visibles };
  });
  const cambiarEtiqueta = (tipo: TipoTarea, etiqueta: string): void => setPreferencias((actual) => ({ ...actual, etiquetas: { ...actual.etiquetas, [tipo]: etiqueta } }));
  const mover = (origen: TipoTarea, destino: TipoTarea): void => setPreferencias((actual) => {
    if (origen === destino) return actual;
    const orden = actual.orden.filter((tipo) => tipo !== origen);
    orden.splice(orden.indexOf(destino), 0, origen);
    return { ...actual, orden };
  });
  const usarSelectorMovil = opciones.length > 4;

  return (
    <div className={`tabs-wrap${usarSelectorMovil ? " has-mobile-select" : ""}`}>
      <div className="tabs" role="tablist" aria-label="Filtrar por tipo">
        {opciones.map((opcion) => <button key={opcion.value} role="tab" aria-selected={value === opcion.value} className={value === opcion.value ? "on" : ""} onClick={() => onChange(opcion.value)}>{opcion.label}</button>)}
      </div>
      {usarSelectorMovil && <select className="tabs-mobile-select" value={value} onChange={(e) => onChange(e.target.value as Filtro)} aria-label="Filtrar por tipo">{opciones.map((opcion) => <option key={opcion.value} value={opcion.value}>{opcion.label}</option>)}</select>}
      <button type="button" className="tabs-config" onClick={() => setConfigurando((abierto) => !abierto)} aria-label="Personalizar filtros" aria-expanded={configurando}><Icon name="sliders" size={16} /><span>Personalizar</span></button>
      {configurando && <section className="tabs-editor" aria-label="Personalizar filtros">
        <header><strong>Personaliza tus filtros</strong><button type="button" onClick={() => setConfigurando(false)} aria-label="Cerrar">×</button></header>
        <p>Arrastra las etiquetas para ordenarlas, muéstralas u ocúltalas y cambia su nombre.</p>
        <div className="tabs-editor-list">{tiposOrdenados.map((tipo) => <div key={tipo.value} className="tabs-editor-row" draggable onDragStart={(e) => { e.dataTransfer.setData("application/x-agenda-tag", tipo.value); e.dataTransfer.effectAllowed = "move"; }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const origen = e.dataTransfer.getData("application/x-agenda-tag") as TipoTarea; if (origen) mover(origen, tipo.value); }}><span className="tabs-drag-handle" aria-label={`Arrastrar ${tipo.label}`}>⠿</span><input type="checkbox" checked={preferencias.visibles.includes(tipo.value)} onChange={() => alternar(tipo.value)} aria-label={`Mostrar ${tipo.label}`} /><input value={preferencias.etiquetas[tipo.value] ?? tipo.label} onChange={(e) => cambiarEtiqueta(tipo.value, e.target.value)} aria-label={`Nombre para ${tipo.label}`} /></div>)}</div>
        <button type="button" className="tabs-reset" onClick={() => setPreferencias(porDefecto())}>Restablecer</button>
      </section>}
    </div>
  );
}
