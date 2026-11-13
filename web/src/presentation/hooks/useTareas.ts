import { useCallback, useEffect, useState } from "react";
import type { NuevaTarea, Tarea, TareaEditable } from "../../domain/entities";
import { SYNC_COMPLETED_EVENT } from "../../infrastructure/offline/syncManager";
import { useServices } from "../ServicesContext";

export function useTareas() {
  const { tareas: repo } = useServices();
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<void>): Promise<void> => {
    try { setError(null); await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "Error desconocido"); }
  }, []);

  useEffect(() => { void run(async () => setTareas(await repo.list())); }, [repo, run]);

  useEffect(() => {
    const onSynced = () => {
      void run(async () => setTareas(await repo.list()));
    };
    window.addEventListener(SYNC_COMPLETED_EVENT, onSynced);
    return () => window.removeEventListener(SYNC_COMPLETED_EVENT, onSynced);
  }, [repo, run]);

  return {
    tareas,
    error,
    add: (n: NuevaTarea) => run(async () => { const t = await repo.create(n); setTareas((p) => [...p, t]); }),
    toggle: (t: Tarea) => run(async () => {
      await repo.setDone(t.id, !t.hecha);
      setTareas((p) => p.map((x) => (x.id === t.id ? { ...x, hecha: !t.hecha } : x)));
    }),
    update: (id: string, cambios: TareaEditable) => run(async () => {
      await repo.update(id, cambios);
      setTareas((p) => p.map((x) => (x.id === id ? { ...x, ...cambios, descripcion: cambios.descripcion === undefined ? x.descripcion : (cambios.descripcion?.trim() || null) } : x)));
    }),
    remove: (id: string) => run(async () => { await repo.remove(id); setTareas((p) => p.filter((x) => x.id !== id)); }),
  };
}
