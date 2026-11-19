import { REDES } from "@/lib/curso";
import type { PiezaVista, RedVista } from "@/lib/tipos";

export function nombreRed(id: string): string {
  return REDES.find(([red]) => red === id)?.[1] ?? id;
}

// Una red cuenta para la pieza si tiene textos o si ya se programó o publicó en ella.
export function tieneContenido(red: RedVista): boolean {
  return red.textos !== null || red.estado.estado !== "pendiente";
}

// Redes en que se publica cada tipo de pieza: la lección en YouTube y LinkedIn;
// el reel de lanzamiento y los shorts en YouTube, Instagram, TikTok y LinkedIn.
export const REDES_POR_TIPO: Record<PiezaVista["tipo"], RedVista["red"][]> = {
  leccion: ["youtube", "linkedin"],
  short: ["youtube", "instagram", "tiktok", "linkedin"],
  reel: ["youtube", "instagram", "tiktok", "linkedin"],
};

function redPendiente(red: RedVista["red"]): RedVista {
  return { red, textos: null, estado: { estado: "pendiente", fecha: null, url: null } };
}

// Las redes del tipo de la pieza (aunque aún no tengan textos, para poder
// programarlas o marcarlas) y cualquier otra que ya tenga contenido, en el orden fijo.
export function redesDisponibles(pieza: PiezaVista): RedVista[] {
  const previstas = new Set<string>(REDES_POR_TIPO[pieza.tipo]);
  return REDES.flatMap(([id]) => {
    const real = pieza.redes.find(({ red }) => red === id);
    if (real && tieneContenido(real)) return [real];
    if (previstas.has(id)) return [real ?? redPendiente(id)];
    return [];
  });
}

// LinkedIn no publica la lección entera, sino un clip horizontal hecho para esa red
// (publicar/4-linkedin/). Sin ese clip, la red aún no está lista para subirse.
export function faltaVideoPropio(pieza: Pick<PiezaVista, "tipo">, red: RedVista): boolean {
  return pieza.tipo === "leccion" && red.red === "linkedin" && !red.textos?.video;
}

export const AVISO_SIN_VIDEO_LINKEDIN =
  "Aún no hay vídeo para LinkedIn. Prepáralo en 4-linkedin/ antes de marcarlo como subido.";

export function avisoRedesAusentes(pieza: PiezaVista): string | null {
  if (!pieza.redes.some(tieneContenido)) return null;
  const disponibles = new Set(redesDisponibles(pieza).map(({ red }) => red));
  const nombres = REDES.filter(([id]) => !disponibles.has(id)).map(([, nombre]) => nombre);
  if (nombres.length === 0) return null;
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} ni ${nombres.at(-1)}`;
  return `Esta pieza no se publica en ${lista}`;
}
