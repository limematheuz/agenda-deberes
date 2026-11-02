import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "../Icon/Icon";
import "./Dialog.css";

interface Props {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

export function Dialog({ abierto, titulo, onCerrar, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog ref={ref} className="dialog" onClose={onCerrar} onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      {abierto && (
        <div className="dialog-body">
          <header>
            <h2 className="cap">{titulo}</h2>
            <button className="icon-btn" onClick={onCerrar} aria-label="Cerrar"><Icon name="x" /></button>
          </header>
          {children}
        </div>
      )}
    </dialog>
  );
}
