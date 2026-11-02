import { useEffect, useState } from "react";
import { useServices } from "../ServicesContext";

export function useAuth(): { loading: boolean; loggedIn: boolean } {
  const { auth } = useServices();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    void auth.haySesion().then((s) => { setLoggedIn(s); setLoading(false); });
    return auth.onChange(setLoggedIn);
  }, [auth]);
  return { loading, loggedIn };
}
