import type { AuthGateway } from "../../domain/ports";
import { clearAllLocalSessionCaches, ensureActiveUserScope, flushSyncQueue } from "../offline/syncManager";
import { assertOk, supabase } from "./client";
import { resetUserDataMemoryCache } from "./user-data.gateway";

export const supabaseAuthGateway: AuthGateway = {
  async haySesion() {
    return (await supabase.auth.getSession()).data.session !== null;
  },
  async obtenerEmail() {
    return (await supabase.auth.getSession()).data.session?.user?.email ?? null;
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user?.id) {
        if (ensureActiveUserScope(s.user.id)) {
          resetUserDataMemoryCache();
        }
      }
      cb(s !== null);
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
