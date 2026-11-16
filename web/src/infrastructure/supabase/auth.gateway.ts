import type { AuthGateway } from "../../domain/ports";
import { clearAllLocalSessionCaches, ensureActiveUserScope, flushSyncQueue, getActiveUserId } from "../offline/syncManager";
import { assertOk, supabase } from "./client";
import { resetUserDataMemoryCache } from "./user-data.gateway";

interface SesionLocalRespaldo {
  userId: string;
  email: string | null;
}

function leerSesionLocalRespaldo(): SesionLocalRespaldo | null {
  if (typeof localStorage === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("sb-") || !k.endsWith("-auth-token")) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        user?: { id?: string; email?: string };
        currentSession?: { user?: { id?: string; email?: string } };
      };
      const user = parsed.user ?? parsed.currentSession?.user;
      if (user?.id) {
        return { userId: user.id, email: user.email ?? null };
      }
    }
    const activeUserId = getActiveUserId();
    if (activeUserId) {
      const perfilRaw = localStorage.getItem("agenda-perfil-usuario");
      const perfil = perfilRaw ? (JSON.parse(perfilRaw) as { email?: string }) : null;
      return { userId: activeUserId, email: perfil?.email ?? null };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export const supabaseAuthGateway: AuthGateway = {
  async haySesion() {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data.session !== null) return true;
      if (error || (typeof navigator !== "undefined" && !navigator.onLine)) {
        return leerSesionLocalRespaldo() !== null;
      }
      return false;
    } catch {
      return leerSesionLocalRespaldo() !== null;
    }
  },
  async obtenerEmail() {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) return data.session.user.email;
    } catch {
      /* fallback local offline */
    }
    return leerSesionLocalRespaldo()?.email ?? null;
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (s?.user?.id) {
        if (ensureActiveUserScope(s.user.id)) {
          resetUserDataMemoryCache();
        }
        cb(true);
        return;
      }
      // Sin conexión, un fallo de refresh de token no debe expulsar al usuario si conserva sesión local
      if (
        event !== "SIGNED_OUT" &&
        typeof navigator !== "undefined" &&
        !navigator.onLine &&
        leerSesionLocalRespaldo() !== null
      ) {
        cb(true);
        return;
      }
      cb(false);
    });
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    assertOk(error);
    if (data.user?.id) {
      if (ensureActiveUserScope(data.user.id)) {
        resetUserDataMemoryCache();
      }
    }
  },
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    assertOk(error);
    if (data.user?.id) {
      if (ensureActiveUserScope(data.user.id)) {
        resetUserDataMemoryCache();
      }
    }
    return data.session !== null;
  },
  async signOut() {
    try {
      await flushSyncQueue();
    } catch {
      // No bloquear el cierre de sesión si no hay red
    }
    clearAllLocalSessionCaches();
    resetUserDataMemoryCache();
    await supabase.auth.signOut();
  },
};
