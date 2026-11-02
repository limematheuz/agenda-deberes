import type { AuthGateway } from "../../domain/ports";
import { assertOk, supabase } from "./client";

export const supabaseAuthGateway: AuthGateway = {
  async haySesion() {
    return (await supabase.auth.getSession()).data.session !== null;
  },
  onChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => cb(s !== null));
    return () => data.subscription.unsubscribe();
  },
  async signIn(email, password) {
    assertOk((await supabase.auth.signInWithPassword({ email, password })).error);
  },
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    assertOk(error);
    return data.session !== null;
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};
