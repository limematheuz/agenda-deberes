const URL_TOKEN_REGEX =
  /((?:https?:\/\/|www\.)[^\s]+|(?<![@\w])(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:com|es|cat|org|net|edu|gov|io|app|dev|me|co|ai|gg|be|tv|info|biz|eu|uk|fr|de|it|pt|br|us|ca|mx|ar|cl|pe|uy|ly|gl|to|sh|so|page|site|online|store|tech|cloud|link|work|design|studio|academy|school)(?:\/[^\s]*)?)/gi;

export function contieneEnlace(texto: string | null | undefined): boolean {
  if (!texto) return false;
  URL_TOKEN_REGEX.lastIndex = 0;
  return URL_TOKEN_REGEX.test(texto);
}

export interface SegmentoTexto {
  tipo: "texto" | "enlace";
  valor: string;
  href?: string;
  etiqueta?: string;
  sufijo?: string;
}

function formatearEtiqueta(href: string, fallback: string): string {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./i, "");
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname.replace(/\/$/, "") : "";
    const corto = path.length > 20 ? `${path.slice(0, 18)}…` : path;
    return `${host}${corto}`;
  } catch {
    return fallback.length > 30 ? `${fallback.slice(0, 28)}…` : fallback;
  }
}

export function segmentarTextoConEnlaces(texto: string): SegmentoTexto[] {
  const partes = texto.split(URL_TOKEN_REGEX);
  return partes
    .filter((parte) => parte.length > 0)
    .map((parte) => {
      URL_TOKEN_REGEX.lastIndex = 0;
      if (URL_TOKEN_REGEX.test(parte)) {
        const recorte = parte.replace(/[.,;:!?)]+$/, "");
        const sufijo = parte.slice(recorte.length);
        const href = /^https?:\/\//i.test(recorte) ? recorte : `https://${recorte}`;
        return {
          tipo: "enlace",
          valor: recorte,
          href,
          etiqueta: formatearEtiqueta(href, recorte),
          sufijo,
        };
      }
      return { tipo: "texto", valor: parte };
    });
}
