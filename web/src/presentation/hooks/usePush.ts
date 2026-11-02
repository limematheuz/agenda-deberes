import { useEffect, useState } from "react";
import type { EstadoPush } from "../../domain/ports";
import { useServices } from "../ServicesContext";

export function usePush() {
  const { push } = useServices();
  const [estado, setEstado] = useState<EstadoPush>("inactivo");
  const [error, setError] = useState<string | null>(null);
  const fallo = (e: unknown): void => setError(e instanceof Error ? e.message : "Error desconocido");

  useEffect(() => {
    // Si ya está activo, se vuelve a guardar la suscripción por si se inició sesión con otra cuenta.
    void push.estado().then((s) => (s === "activo" ? push.activar() : s)).then(setEstado).catch(fallo);
  }, [push]);

  const activar = async (): Promise<void> => {
    try { setError(null); setEstado(await push.activar()); } catch (e) { fallo(e); }
  };
  return { estado, error, activar };
}
