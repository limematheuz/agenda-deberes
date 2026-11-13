import { useEffect, useState } from "react";
import type { EstadoPush } from "../../domain/ports";
import { useServices } from "../ServicesContext";

export function usePush() {
  const { push } = useServices();
  const [estado, setEstado] = useState<EstadoPush>("inactivo");
  const [error, setError] = useState<string | null>(null);
  const fallo = (e: unknown): void => setError(e instanceof Error ? e.message : "Error desconocido");

  useEffect(() => {
    // Sincronización silenciosa en segundo plano al iniciar sesión.
    void push
      .estado()
      .then((s) => (s === "activo" ? push.activar().catch(() => s) : s))
      .then(setEstado)
      .catch(() => undefined);
  }, [push]);

  const activar = async (): Promise<EstadoPush> => {
    try {
      setError(null);
      const siguiente = await push.activar();
      setEstado(siguiente);
      return siguiente;
    } catch (e) {
      fallo(e);
      return estado;
    }
  };
  return { estado, error, activar };
}
