import { useEffect } from "react";
import { Icon } from "../Icon/Icon";
import "./Toast.css";

interface Props { mensaje: string | null; onCerrar: () => void }

/** Aviso efímero para errores de operaciones remotas; no interrumpe el calendario. */
export function Toast({ mensaje, onCerrar }: Props) {
  useEffect(() => {
    if (!mensaje) return;
    const temporizador = window.setTimeout(onCerrar, 6_000);
    return () => window.clearTimeout(temporizador);
  }, [mensaje, onCerrar]);
  if (!mensaje) return null;
  return <div className="toast-region" aria-live="assertive" aria-atomic="true"><div className="toast toast-error" role="alert"><span className="toast-mark">!</span><p>{mensaje}</p><button type="button" aria-label="Cerrar aviso" onClick={onCerrar}><Icon name="x" size={16} /></button></div></div>;
}
