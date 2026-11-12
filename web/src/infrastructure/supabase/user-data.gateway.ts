import type { AgendaCloudState, UserDataGateway } from "../../domain/ports";
import { supabase } from "./client";

const LOCAL_CACHE_KEY = "agenda-cloud-state-cache";
let acumulado: AgendaCloudState = {};
let timer: number | null = null;

function leerCacheLocal(): AgendaCloudState | null {
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    return raw ? (JSON.parse(raw) as AgendaCloudState) : null;
  } catch {
    return null;
  }
}

function guardarCacheLocal(estado: AgendaCloudState): void {
  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(estado));
  } catch {
    // Ignorar errores de cuota local
  }
}

async function sincronizarEnSupabase(estado: AgendaCloudState): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return;

  const ahora = new Date().toISOString();
  const payload: AgendaCloudState = { ...estado, updatedAt: ahora };

  // 1. Intentar guardar en la tabla dedicada public.agenda_preferencias (migración 0007)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientAny = supabase as any;
  try {
    await clientAny.from("agenda_preferencias").upsert(
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
      { onConflict: "user_id" }
    );
  } catch {
    // Si la migración 0007 aún no se ejecutó, el respaldo en user_metadata garantiza persistencia en BBDD
  }

  // 2. Guardar también en auth.users (user_metadata en PostgreSQL de Supabase), que funciona siempre entre dispositivos sin requerir migración manual previa
  try {
    await supabase.auth.updateUser({
      data: { agenda_cloud_sync: payload },
    });
  } catch {
    // Ignorar fallos de red puntuales; queda en caché local
  }
}

export const supabaseUserDataGateway: UserDataGateway = {
  async load(): Promise<AgendaCloudState | null> {
    const local = leerCacheLocal();
    if ( local ) {
      acumulado = { ...local };
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return local;

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

      if (remoto) {
        acumulado = { ...local, ...remoto };
        guardarCacheLocal(acumulado);
        return acumulado;
      }
    } catch {
      // Si no hay red, usamos la copia local
    }

    return local;
  },

  async save(parcial: Partial<AgendaCloudState>): Promise<void> {
    acumulado = {
      ...acumulado,
      ...parcial,
      updatedAt: new Date().toISOString(),
    };
    guardarCacheLocal(acumulado);

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
