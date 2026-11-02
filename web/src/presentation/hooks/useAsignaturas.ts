import { useCallback, useEffect, useState } from "react";
import type { Asignatura, NuevaAsignatura } from "../../domain/entities";
import { useServices } from "../ServicesContext";

export function useAsignaturas() {
  const { asignaturas: repo } = useServices();
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<void>): Promise<void> => {
    try { setError(null); await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error desconocido"); }
  }, []);

  useEffect(() => { void run(async () => setAsignaturas(await repo.list())); }, [repo, run]);

  return {
    asignaturas,
    error,
    add: (n: NuevaAsignatura) => run(async () => {
      const a = await repo.create(n);
      setAsignaturas((p) => [...p, a].sort((x, y) => x.nombre.localeCompare(y.nombre)));
    }),
    remove: (id: string) => run(async () => { await repo.remove(id); setAsignaturas((p) => p.filter((x) => x.id !== id)); }),
  };
}
