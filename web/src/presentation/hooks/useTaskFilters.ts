import { useMemo, useState } from "react";
import { filtrarTareas, type Filtro } from "../../domain/agenda";
import type { Asignatura, Tarea } from "../../domain/entities";

export function useTaskFilters(tareas: readonly Tarea[], asignaturas: ReadonlyMap<string, Asignatura>) {
  const [tipo, setTipo] = useState<Filtro>("todos");
  const [asignatura, setAsignatura] = useState("todas");
  const [texto, setTexto] = useState("");
  const visibles = useMemo(
    () => filtrarTareas(tareas, { tipo, asignatura, texto }, (id) => asignaturas.get(id)?.nombre ?? ""),
    [tareas, tipo, asignatura, texto, asignaturas],
  );
  return { tipo, setTipo, asignatura, setAsignatura, texto, setTexto, visibles };
}
