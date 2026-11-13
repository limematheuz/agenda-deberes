import type { AgendaCloudState, UserDataGateway } from "../../domain/ports";
import { supabase } from "./client";
import { ensureActiveUserScope, isUserDataDirty, markUserDataDirty, registerSyncExecutors } from "../offline/syncManager";

const LOCAL_CACHE_PREFIX = "agenda-cloud-state-cache";
let acumulado: AgendaCloudState = {};
let timer: number | null = null;
let currentUserId: string | null = null;

function cacheKeyFor(userId: string | null): string {
  return userId ? `${LOCAL_CACHE_PREFIX}-${userId}` : LOCAL_CACHE_PREFIX;
}

export function resetUserDataMemoryCache(): void {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  acumulado = {};
  currentUserId = null;
}

function leerCacheLocal(userId: string | null): AgendaCloudState | null {
  try {
    const raw = localStorage.getItem(cacheKeyFor(userId));
    return raw ? (JSON.parse(raw) as AgendaCloudState) : null;
  } catch {
    return null;
  }
}

function guardarCacheLocal(userId: string | null, estado: AgendaCloudState): void {
  try {
    localStorage.setItem(cacheKeyFor(userId), JSON.stringify(estado));
  } catch {
    // Ignorar errores de cuota local
  }
}

async function obtenerUsuarioIdActual(): Promise<string | null> {
  if (currentUserId) return currentUserId;
  try {
    const { data } = await supabase.auth.getSession();
    const id = data.session?.user?.id ?? null;
    if (id) currentUserId = id;
    return id;
  } catch {
    return null;
  }
}

async function sincronizarEnSupabase(estado: AgendaCloudState): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) return false;

    const ahora = new Date().toISOString();
    const payload: AgendaCloudState = { ...estado, updatedAt: ahora };
    let guardadoEnNube = false;

    // 1. Intentar guardar en la tabla dedicada public.agenda_preferencias (migración 0007)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientAny = supabase as any;
    try {
      const { error } = await clientAny.from("agenda_preferencias").upsert(
        {
          user_id: user.id,
          perfil: payload.perfil ?? {},
          categorias: payload.categorias ?? [],
          categoria_mapa: payload.categoriaPorAsignatura ?? {},
          clases_semanales: payload.clasesSemanales ?? [],
          mostrar_clases: payload.mostrarClasesEnCalendario ?? true,
          recordatorios: payload.recordatorios ?? [],
          notas_bloc: payload.notasBloc ?? [],
          colores_bloc: payload.coloresBloc ?? [],
          updated_at: ahora,
        },
        { onConflict: "user_id" },
      );
      if (!error) guardadoEnNube = true;
    } catch {
      // Si la migración 0007 aún no se ejecutó, el respaldo en user_metadata garantiza persistencia en BBDD
    }

    // 2. Guardar también en auth.users (user_metadata en PostgreSQL de Supabase)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { agenda_cloud_sync: payload },
      });
      if (!error) guardadoEnNube = true;
    } catch {
      // Ignorar fallos de red puntuales; queda en caché local
    }

    if (guardadoEnNube) {
      markUserDataDirty(false);
    }
    return guardadoEnNube;
  } catch {
    return false;
  }
}

registerSyncExecutors({
  syncUserDataRemote: async () => {
    const uid = await obtenerUsuarioIdActual();
    const cache = leerCacheLocal(uid);
    if (!cache) return true;
    return sincronizarEnSupabase(cache);
  },
});

export const supabaseUserDataGateway: UserDataGateway = {
  async load(): Promise<AgendaCloudState | null> {
    const uid = await obtenerUsuarioIdActual();
    if (uid) {
      const cambioCuenta = ensureActiveUserScope(uid);
      if (cambioCuenta) {
        resetUserDataMemoryCache();
        currentUserId = uid;
      }
    }

    const local = leerCacheLocal(uid);
    if (local) {
      acumulado = { ...local };
    } else {
      acumulado = {};
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return local;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return local;

      currentUserId = user.id;
      ensureActiveUserScope(user.id);

      let desdeTabla: AgendaCloudState | null = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const clientAny = supabase as any;
      const { data: fila, error } = await clientAny
        .from("agenda_preferencias")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && fila) {
        desdeTabla = {
          perfil: fila.perfil,
          categorias: fila.categorias,
          categoriaPorAsignatura: fila.categoria_mapa,
          clasesSemanales: fila.clases_semanales,
          mostrarClasesEnCalendario: fila.mostrar_clases,
          recordatorios: fila.recordatorios,
          notasBloc: fila.notas_bloc,
          coloresBloc: fila.colores_bloc,
          updatedAt: fila.updated_at,
        };
      }

      const metaSync = (user.user_metadata?.agenda_cloud_sync ?? null) as AgendaCloudState | null;

      let remoto: AgendaCloudState | null = desdeTabla ?? metaSync;
      if (desdeTabla && metaSync) {
        const tTabla = desdeTabla.updatedAt ? Date.parse(desdeTabla.updatedAt) : 0;
        const tMeta = metaSync.updatedAt ? Date.parse(metaSync.updatedAt) : 0;
        remoto = tMeta > tTabla ? metaSync : desdeTabla;
      }

      // Si hay cambios locales pendientes de subir para ESTE usuario, priorizar lo local sobre el remoto antiguo
      if (isUserDataDirty() && local) {
        acumulado = { ...remoto, ...local };
        guardarCacheLocal(user.id, acumulado);
        void sincronizarEnSupabase(acumulado);
        return acumulado;
      }

      if (remoto) {
        acumulado = { ...local, ...remoto };
        guardarCacheLocal(user.id, acumulado);
        return acumulado;
      }
    } catch {
      // Si no hay red, usamos la copia local de este usuario
    }

    return local;
  },

  async save(parcial: Partial<AgendaCloudState>): Promise<void> {
    const uid = await obtenerUsuarioIdActual();
    acumulado = {
      ...acumulado,
      ...parcial,
      updatedAt: new Date().toISOString(),
    };
    guardarCacheLocal(uid, acumulado);
    markUserDataDirty(true);

    if (timer !== null) {
      window.clearTimeout(timer);
    }
    const snapshot = { ...acumulado };
    timer = window.setTimeout(() => {
      timer = null;
      void sincronizarEnSupabase(snapshot);
    }, 650);
  },
};
