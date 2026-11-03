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
      const siguiente = [...asignaturas, a].map((asignatura, orden) => ({ ...asignatura, orden }));
      await repo.reorder(siguiente.map((asignatura) => asignatura.id));
      setAsignaturas(siguiente);
    }),
    remove: (id: string) => run(async () => { await repo.remove(id); setAsignaturas((p) => p.filter((x) => x.id !== id)); }),
    reorder: (ids: readonly string[]) => {
      const anterior = asignaturas;
      const porId = new Map(asignaturas.map((asignatura) => [asignatura.id, asignatura]));
      const siguiente = ids.map((id, orden) => ({ ...porId.get(id)!, orden })).filter(Boolean);
      setAsignaturas(siguiente);
      void run(async () => {
        try { await repo.reorder(ids); }
        catch (e) { setAsignaturas(anterior); throw e; }
      });
    },
  };
}
