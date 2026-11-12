import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import "./Dialog.css";

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

// Contador global: varios diálogos abiertos a la vez comparten un único bloqueo de scroll.
// Se fija el body en su posición actual para que el fondo no pueda desplazarse de ninguna forma.
let dialogosAbiertos = 0;
let scrollGuardado = 0;
function bloquearScroll(): () => void {
  dialogosAbiertos += 1;
  if (dialogosAbiertos === 1) {
    scrollGuardado = window.scrollY;
    const body = document.body;
    body.style.position = "fixed";
    body.style.top = `-${scrollGuardado}px`;
    body.style.left = "0";
    body.style.right = "0";
    document.documentElement.classList.add("modal-open");
  }
  return () => {
    dialogosAbiertos = Math.max(0, dialogosAbiertos - 1);
    if (dialogosAbiertos === 0) {
      const body = document.body;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      document.documentElement.classList.remove("modal-open");
      window.scrollTo(0, scrollGuardado);
    }
  };
}

export function Dialog({ abierto, titulo, onCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    return bloquearScroll();
  }, [abierto]);

  return (
    <dialog ref={ref} className="dialog" onClose={onCerrar} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      {abierto && (
        <div className="dialog-body">
          <header>
            <h2 className="cap">{titulo}</h2>
            <button className="icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icon name="x" /></button>
          </header>
          <div className="dialog-content">{children}</div>
        </div>
      )}
    </dialog>
  );
}
