import { useCallback, useEffect, useState } from "react";
import type { Asignatura, NuevaAsignatura } from "../../domain/entities";
import { SYNC_COMPLETED_EVENT } from "../../infrastructure/offline/syncManager";
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

  useEffect(() => {
    const onSynced = () => {
      void run(async () => setAsignaturas(await repo.list()));
    };
    window.addEventListener(SYNC_COMPLETED_EVENT, onSynced);
    return () => window.removeEventListener(SYNC_COMPLETED_EVENT, onSynced);
  }, [repo, run]);

  return {
    asignaturas,
    error,
    add: async (n: NuevaAsignatura): Promise<Asignatura | void> => {
      let creada: Asignatura | undefined;
      await run(async () => {
        const a = await repo.create(n);
        creada = a;
        const siguiente = [...asignaturas, a].map((asignatura, orden) => ({ ...asignatura, orden }));
        await repo.reorder(siguiente.map((asignatura) => asignatura.id));
        setAsignaturas(siguiente);
      });
      return creada;
    },
    remove: (id: string) => run(async () => { await repo.remove(id); setAsignaturas((p) => p.filter((x) => x.id !== id)); }),
    update: (id: string, cambios: Pick<Asignatura, "nombre" | "color">) => run(async () => { await repo.update(id, cambios); setAsignaturas((p) => p.map((a) => a.id === id ? { ...a, ...cambios } : a)); }),
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
