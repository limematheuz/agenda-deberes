import type { Asignatura, NuevaAsignatura, NuevaTarea, Tarea, TareaEditable } from "../../domain/entities";

const QUEUE_KEY = "agenda-sync-queue-v1";
const USERDATA_DIRTY_KEY = "agenda-userdata-dirty-v1";
const TAREAS_CACHE_KEY = "agenda-tareas-cache-v1";
const ASIGNATURAS_CACHE_KEY = "agenda-asignaturas-cache-v1";
const FALLBACK_DESC_KEY = "agenda-descripciones-fallback";

export const SYNC_COMPLETED_EVENT = "calendarappio-sync-completed";

export type SyncStatus = "synced" | "offline" | "syncing" | "pending" | "error";

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
  lastError: string | null;
}

export type PendingOp =
  | { kind: "tarea:create"; tempId: string; payload: NuevaTarea; createdAt: number }
  | { kind: "tarea:setDone"; id: string; hecha: boolean; createdAt: number }
  | { kind: "tarea:update"; id: string; cambios: TareaEditable; createdAt: number }
  | { kind: "tarea:remove"; id: string; createdAt: number }
  | { kind: "asignatura:create"; tempId: string; payload: NuevaAsignatura; createdAt: number }
  | { kind: "asignatura:update"; id: string; cambios: Pick<Asignatura, "nombre" | "color">; createdAt: number }
  | { kind: "asignatura:remove"; id: string; createdAt: number }
  | { kind: "asignatura:reorder"; ids: string[]; createdAt: number };

export interface SyncExecutors {
  createTareaRemote: (n: NuevaTarea) => Promise<Tarea>;
  setTareaDoneRemote: (id: string, hecha: boolean) => Promise<void>;
  updateTareaRemote: (id: string, cambios: TareaEditable) => Promise<void>;
  removeTareaRemote: (id: string) => Promise<void>;
  createAsignaturaRemote: (n: NuevaAsignatura) => Promise<Asignatura>;
  updateAsignaturaRemote: (id: string, cambios: Pick<Asignatura, "nombre" | "color">) => Promise<void>;
  removeAsignaturaRemote: (id: string) => Promise<void>;
  reorderAsignaturasRemote: (ids: readonly string[]) => Promise<void>;
  syncUserDataRemote: () => Promise<boolean>;
}

let executors: Partial<SyncExecutors> = {};
let activeFlush: Promise<void> | null = null;
let isSyncingNow = false;
let lastSyncError: string | null = null;
let browserOnline = typeof navigator === "undefined" ? true : navigator.onLine;
const listeners = new Set<(state: SyncState) => void>();

export function registerSyncExecutors(partial: Partial<SyncExecutors>): void {
  executors = { ...executors, ...partial };
}

export function isOfflineId(id: string): boolean {
  return id.startsWith("offline-");
}

export function generateOfflineId(prefix: "tarea" | "asig"): string {
  const uid = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  return `offline-${prefix}-${uid}`;
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (!err) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("load failed") ||
    msg.includes("err_internet_disconnected") ||
    msg.includes("fetch") ||
    msg.includes("timeout") ||
    msg.includes("connection")
  );
}

// --- Caché local de entidades ---

export function readTareasCache(): Tarea[] {
  try {
    const raw = localStorage.getItem(TAREAS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Tarea[]) : [];
  } catch {
    return [];
  }
}

export function writeTareasCache(tareas: readonly Tarea[]): void {
  try {
    localStorage.setItem(TAREAS_CACHE_KEY, JSON.stringify(tareas));
  } catch {
    /* ignore quota errors */
  }
}

export function readAsignaturasCache(): Asignatura[] {
  try {
    const raw = localStorage.getItem(ASIGNATURAS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Asignatura[]) : [];
  } catch {
    return [];
  }
}

export function writeAsignaturasCache(asignaturas: readonly Asignatura[]): void {
  try {
    localStorage.setItem(ASIGNATURAS_CACHE_KEY, JSON.stringify(asignaturas));
  } catch {
    /* ignore quota errors */
  }
}

// --- Cola de sincronización ---

export function readQueue(): PendingOp[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingOp[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* ignore quota errors */
  }
  notifyListeners();
}

export function isUserDataDirty(): boolean {
  try {
    return localStorage.getItem(USERDATA_DIRTY_KEY) === "1";
  } catch {
    return false;
  }
}

export function markUserDataDirty(dirty: boolean): void {
  try {
    if (dirty) localStorage.setItem(USERDATA_DIRTY_KEY, "1");
    else localStorage.removeItem(USERDATA_DIRTY_KEY);
  } catch {
    /* ignore */
  }
  notifyListeners();
}

export function getSyncState(): SyncState {
  const isOnline = typeof navigator === "undefined" ? true : navigator.onLine && browserOnline;
  const queueLen = readQueue().length;
  const pendingCount = queueLen + (isUserDataDirty() ? 1 : 0);

  let status: SyncStatus = "synced";
  if (isSyncingNow) {
    status = "syncing";
  } else if (!isOnline) {
    status = "offline";
  } else if (lastSyncError && pendingCount > 0) {
    status = "error";
  } else if (pendingCount > 0) {
    status = "pending";
  }

  return { status, pendingCount, isOnline, lastError: lastSyncError };
}

function notifyListeners(): void {
  const state = getSyncState();
  listeners.forEach((cb) => cb(state));
}

export function subscribeSyncState(cb: (state: SyncState) => void): () => void {
  listeners.add(cb);
  cb(getSyncState());
  return () => listeners.delete(cb);
}

export function enqueueOp(op: PendingOp): void {
  let queue = readQueue();

  if (op.kind === "tarea:remove" && isOfflineId(op.id)) {
    // Cancelar creación y cambios locales de una tarea que nunca llegó a Supabase
    queue = queue.filter((item) => {
      if (item.kind === "tarea:create" && item.tempId === op.id) return false;
      if ((item.kind === "tarea:setDone" || item.kind === "tarea:update") && item.id === op.id) return false;
      return true;
    });
    writeQueue(queue);
    return;
  }

  if (op.kind === "tarea:setDone") {
    queue = queue.filter((item) => !(item.kind === "tarea:setDone" && item.id === op.id));
  }

  if (op.kind === "asignatura:remove" && isOfflineId(op.id)) {
    queue = queue.filter((item) => {
      if (item.kind === "asignatura:create" && item.tempId === op.id) return false;
      if (item.kind === "asignatura:update" && item.id === op.id) return false;
      return true;
    });
    queue = queue.map((item) =>
      item.kind === "asignatura:reorder"
        ? { ...item, ids: item.ids.filter((id) => id !== op.id) }
        : item,
    );
    writeQueue(queue);
    return;
  }

  if (op.kind === "asignatura:reorder") {
    queue = queue.filter((item) => item.kind !== "asignatura:reorder");
  }

  queue.push(op);
  lastSyncError = null;
  writeQueue(queue);
}

function replaceTareaIdEverywhere(tempId: string, realId: string, queue: PendingOp[]): PendingOp[] {
  // 1. Caché local de tareas
  const tareas = readTareasCache();
  if (tareas.length > 0) {
    writeTareasCache(tareas.map((t) => (t.id === tempId ? { ...t, id: realId } : t)));
  }

  // 2. Fallback de descripciones
  try {
    const descMap = JSON.parse(localStorage.getItem(FALLBACK_DESC_KEY) ?? "{}") as Record<string, string>;
    if (descMap[tempId]) {
      descMap[realId] = descMap[tempId];
      delete descMap[tempId];
      localStorage.setItem(FALLBACK_DESC_KEY, JSON.stringify(descMap));
    }
  } catch {
    /* ignore */
  }

  // 3. Operaciones restantes en cola
  return queue.map((item) => {
    if ((item.kind === "tarea:setDone" || item.kind === "tarea:update" || item.kind === "tarea:remove") && item.id === tempId) {
      return { ...item, id: realId };
    }
    return item;
  });
}

function replaceAsignaturaIdEverywhere(tempId: string, realId: string, queue: PendingOp[]): PendingOp[] {
  // 1. Caché local de asignaturas
  const asignaturas = readAsignaturasCache();
  if (asignaturas.length > 0) {
    writeAsignaturasCache(asignaturas.map((a) => (a.id === tempId ? { ...a, id: realId } : a)));
  }

  // 2. Tareas que apuntaban a la asignatura temporal
  const tareas = readTareasCache();
  if (tareas.length > 0) {
    writeTareasCache(tareas.map((t) => (t.asignaturaId === tempId ? { ...t, asignaturaId: realId } : t)));
  }

  // 3. Operaciones restantes en cola
  return queue.map((item) => {
    if ((item.kind === "asignatura:update" || item.kind === "asignatura:remove") && item.id === tempId) {
      return { ...item, id: realId };
    }
    if (item.kind === "asignatura:reorder") {
      return { ...item, ids: item.ids.map((id) => (id === tempId ? realId : id)) };
    }
    if (item.kind === "tarea:create" && item.payload.asignaturaId === tempId) {
      return { ...item, payload: { ...item.payload, asignaturaId: realId } };
    }
    if (item.kind === "tarea:update" && item.cambios.asignaturaId === tempId) {
      return { ...item, cambios: { ...item.cambios, asignaturaId: realId } };
    }
    return item;
  });
}

export async function flushSyncQueue(): Promise<void> {
  if (activeFlush) return activeFlush;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    notifyListeners();
    return;
  }

  const queueInicial = readQueue();
  const dirtyInicial = isUserDataDirty();
  if (queueInicial.length === 0 && !dirtyInicial) {
    lastSyncError = null;
    notifyListeners();
    return;
  }

  activeFlush = (async () => {
    isSyncingNow = true;
    lastSyncError = null;
    notifyListeners();

    let syncedSomething = false;

    try {
      let queue = readQueue();

      while (queue.length > 0) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break;
        const op = queue[0];

        if (op.kind === "tarea:create") {
          if (!executors.createTareaRemote) break;
          const created = await executors.createTareaRemote(op.payload);
          queue = replaceTareaIdEverywhere(op.tempId, created.id, queue.slice(1));
        } else if (op.kind === "tarea:setDone") {
          if (!executors.setTareaDoneRemote) break;
          await executors.setTareaDoneRemote(op.id, op.hecha);
          queue = queue.slice(1);
        } else if (op.kind === "tarea:update") {
          if (!executors.updateTareaRemote) break;
          await executors.updateTareaRemote(op.id, op.cambios);
          queue = queue.slice(1);
        } else if (op.kind === "tarea:remove") {
          if (!executors.removeTareaRemote) break;
          await executors.removeTareaRemote(op.id);
          queue = queue.slice(1);
        } else if (op.kind === "asignatura:create") {
          if (!executors.createAsignaturaRemote) break;
          const created = await executors.createAsignaturaRemote(op.payload);
          queue = replaceAsignaturaIdEverywhere(op.tempId, created.id, queue.slice(1));
        } else if (op.kind === "asignatura:update") {
          if (!executors.updateAsignaturaRemote) break;
          await executors.updateAsignaturaRemote(op.id, op.cambios);
          queue = queue.slice(1);
        } else if (op.kind === "asignatura:remove") {
          if (!executors.removeAsignaturaRemote) break;
          await executors.removeAsignaturaRemote(op.id);
          queue = queue.slice(1);
        } else if (op.kind === "asignatura:reorder") {
          if (!executors.reorderAsignaturasRemote) break;
          await executors.reorderAsignaturasRemote(op.ids);
          queue = queue.slice(1);
        }

        writeQueue(queue);
        syncedSomething = true;
      }

      if (isUserDataDirty() && executors.syncUserDataRemote) {
        const ok = await executors.syncUserDataRemote();
        if (ok) {
          markUserDataDirty(false);
          syncedSomething = true;
        }
      }
    } catch (err) {
      if (!isNetworkError(err)) {
        lastSyncError = err instanceof Error ? err.message : "Error de sincronización";
      }
    } finally {
      isSyncingNow = false;
      activeFlush = null;
      notifyListeners();
      if (syncedSomething && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent(SYNC_COMPLETED_EVENT));
      }
    }
  })();

  return activeFlush;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    browserOnline = true;
    notifyListeners();
    void flushSyncQueue();
  });
  window.addEventListener("offline", () => {
    browserOnline = false;
    notifyListeners();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) {
      browserOnline = true;
      void flushSyncQueue();
    }
  });
}
