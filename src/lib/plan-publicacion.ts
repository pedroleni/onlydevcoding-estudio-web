import { REDES_POR_TIPO } from "@/lib/redes-publicacion";
import type { PiezaVista, RedVista } from "@/lib/tipos";

// Lo que se publica de cada lección, haya o no textos todavía: la lección completa
// en YouTube y LinkedIn, 4 shorts y el reel de lanzamiento (resumen con motion
// graphics) en YouTube, Instagram, TikTok y LinkedIn. 2 + 5 × 4 = 22 publicaciones.
export interface PiezaPrevista {
  id: string;
  tipo: PiezaVista["tipo"];
  titulo: string;
  redes: RedVista["red"][];
}

export const PLAN_LECCION: PiezaPrevista[] = [
  { id: "leccion", tipo: "leccion", titulo: "Lección completa", redes: REDES_POR_TIPO.leccion },
  { id: "reel-salida", tipo: "reel", titulo: "Reel de lanzamiento", redes: REDES_POR_TIPO.reel },
  ...[1, 2, 3, 4].map((n) => ({
    id: `short-${n}`,
    tipo: "short" as const,
    titulo: `Short ${n}`,
    redes: REDES_POR_TIPO.short,
  })),
];

export const PUBLICACIONES_POR_LECCION = PLAN_LECCION.reduce(
  (suma, pieza) => suma + pieza.redes.length,
  0,
);

// Ganchos verticales previstos en una lección que aún no tiene guion (uno por short).
export const GANCHOS_POR_LECCION = 4;
