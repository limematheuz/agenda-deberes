import type { CSSProperties } from "react";

/** Expone el color de la asignatura como variable CSS (--c); sin asignatura, gris. */
export const colorVar = (hex: string | undefined): CSSProperties => ({ "--c": hex ?? "#667085" }) as CSSProperties;
