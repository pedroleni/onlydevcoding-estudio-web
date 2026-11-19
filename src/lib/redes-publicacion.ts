import { REDES } from "@/lib/curso";
import type { PiezaVista, RedVista } from "@/lib/tipos";

export function nombreRed(id: string): string {
  return REDES.find(([red]) => red === id)?.[1] ?? id;
}

// Una red cuenta para la pieza si tiene textos o si ya se programó o publicó en ella.
export function tieneContenido(red: RedVista): boolean {
  return red.textos !== null || red.estado.estado !== "pendiente";
}

const REDES_POR_DEFECTO: Record<PiezaVista["tipo"], RedVista["red"][]> = {
  leccion: ["youtube", "linkedin"],
  short: ["youtube", "instagram", "tiktok"],
  reel: ["youtube", "instagram", "tiktok"],
};

// Si la pieza no tiene contenido en ninguna red, se ofrecen las redes por
// defecto de su tipo (sin textos) para poder programarla o marcarla.
export function redesDisponibles(pieza: PiezaVista): RedVista[] {
  const conContenido = pieza.redes.filter(tieneContenido);
  if (conContenido.length > 0) return conContenido;
  return REDES_POR_DEFECTO[pieza.tipo].map(
    (id) =>
      pieza.redes.find(({ red }) => red === id) ?? {
        red: id,
        textos: null,
        estado: { estado: "pendiente", fecha: null, url: null },
      },
  );
}

// LinkedIn no publica la lección entera, sino un clip horizontal hecho para esa red
// (publicar/4-linkedin/). Sin ese clip, la red aún no está lista para subirse.
export function faltaVideoPropio(pieza: Pick<PiezaVista, "tipo">, red: RedVista): boolean {
  return pieza.tipo === "leccion" && red.red === "linkedin" && !red.textos?.video;
}

export const AVISO_SIN_VIDEO_LINKEDIN =
  "Aún no hay vídeo para LinkedIn. Prepáralo en 4-linkedin/ antes de marcarlo como subido.";

export function avisoRedesAusentes(redes: RedVista[]): string | null {
  if (!redes.some(tieneContenido)) return null;
  const nombres = redes
    .filter((red) => !tieneContenido(red))
    .map(({ red }) => nombreRed(red));
  if (nombres.length === 0) return null;
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} ni ${nombres.at(-1)}`;
  return `Esta pieza no se publica en ${lista}`;
}
