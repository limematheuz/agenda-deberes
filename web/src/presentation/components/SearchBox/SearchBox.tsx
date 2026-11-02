import { useEffect, useRef } from "react";
import { Icon } from "../Icon/Icon";
import "./SearchBox.css";

interface Props { value: string; onChange: (s: string) => void }

export function SearchBox({ value, onChange }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const f = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <label className="search">
      <Icon name="search" />
      <input ref={ref} placeholder="Buscar" value={value} onChange={(e) => onChange(e.target.value)} />
      <kbd>⌘K</kbd>
    </label>
  );
}
