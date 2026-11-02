import type { Filtro } from "../../../domain/agenda";
import type { Asignatura } from "../../../domain/entities";
import { SearchBox } from "../SearchBox/SearchBox";
import { Tabs } from "../Tabs/Tabs";
import "./Toolbar.css";

interface Props {
  tipo: Filtro;
  onTipo: (f: Filtro) => void;
  asignatura: string;
  onAsignatura: (id: string) => void;
  asignaturas: readonly Asignatura[];
  texto: string;
  onTexto: (s: string) => void;
}

export function Toolbar({ tipo, onTipo, asignatura, onAsignatura, asignaturas, texto, onTexto }: Props) {
  return (
    <div className="toolbar">
      <Tabs value={tipo} onChange={onTipo} />
      <select className="mfilter" value={asignatura} onChange={(e) => onAsignatura(e.target.value)} aria-label="Asignatura">
        <option value="todas">Todas las asignaturas</option>
        {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        <option value="ninguna">Sin asignatura</option>
      </select>
      <SearchBox value={texto} onChange={onTexto} />
    </div>
  );
}
