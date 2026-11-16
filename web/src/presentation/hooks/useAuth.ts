import { useEffect, useState } from "react";
import { useServices } from "../ServicesContext";

export function useAuth(): { loading: boolean; loggedIn: boolean } {
  const { auth } = useServices();
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    let activo = true;
    void auth
      .haySesion()
      .then((s) => {
        if (activo) setLoggedIn(s);
      })
      .catch(() => {
        if (activo) setLoggedIn(false);
      })
      .finally(() => {
        if (activo) setLoading(false);
      });
    const unsub = auth.onChange((s) => {
      if (activo) {
        setLoggedIn(s);
        setLoading(false);
      }
    });
    return () => {
      activo = false;
      unsub();
    };
  }, [auth]);

  return { loading, loggedIn };
}
