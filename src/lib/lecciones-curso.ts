import { PUBLICACIONES_POR_LECCION } from "@/lib/plan-publicacion";
import type { EstadoLeccion, LeccionResumen, LeccionTemario } from "@/lib/tipos";

// Una lección del curso: la que ya está en disco o la que solo existe en el temario.
export interface FichaLeccion {
  numero: number;
  titulo: string;
  modulo: string | null;
  leccion: LeccionResumen | null;
}

export type EstadoFicha = "terminada" | "en-marcha" | "por-empezar" | "por-preparar";

export interface PasosLeccion {
  voz: number;
  camara: number;
  video: number;
  publicacion: number;
}

// Colores de los módulos del temario, en orden de aparición.
export const COLORES_MODULO = [
  "#a78bfa",
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#fb7185",
  "#22d3ee",
  "#a3e635",
  "#fb923c",
  "#f472b6",
  "#818cf8",
  "#2dd4bf",
  "#facc15",
  "#c084fc",
  "#60a5fa",
] as const;

export function fichasCurso(
  lecciones: LeccionResumen[],
  temario: LeccionTemario[],
): FichaLeccion[] {
  const porNumero = new Map<number, FichaLeccion>();
  for (const prevista of temario) {
    porNumero.set(prevista.numero, {
      numero: prevista.numero,
      titulo: prevista.titulo,
      modulo: prevista.modulo,
      leccion: null,
    });
  }
  for (const leccion of lecciones) {
    porNumero.set(leccion.numero, {
      numero: leccion.numero,
      titulo: leccion.titulo,
      modulo: porNumero.get(leccion.numero)?.modulo ?? null,
      leccion,
    });
  }
  return [...porNumero.values()].sort((a, b) => a.numero - b.numero);
}

// Módulos en orden, cada uno con su color. Las lecciones sin módulo van en «Otras lecciones».
export function modulosCurso(fichas: FichaLeccion[]): { nombre: string; color: string }[] {
  const nombres: string[] = [];
  for (const { modulo } of fichas) {
    const nombre = modulo ?? "Otras lecciones";
    if (!nombres.includes(nombre)) nombres.push(nombre);
  }
  return nombres.map((nombre, i) => ({
    nombre,
    color: COLORES_MODULO[i % COLORES_MODULO.length],
  }));
}

function fraccion(hechas: number, total: number, guion: boolean): number {
  if (total <= 0) return guion ? 1 : 0;
  return Math.min(1, Math.max(0, hechas / total));
}

// Publicación: lo subido sobre las 17 publicaciones previstas de cada lección
// (o más, si la lección tiene piezas de sobra).
export function publicacionLeccion(estado: EstadoLeccion): { hechas: number; total: number } {
  const avances = Object.values(estado.publicado_avance ?? {});
  const hechas = avances.reduce((suma, { hechas }) => suma + hechas, 0);
  const total = avances.reduce((suma, { total }) => suma + total, 0);
  return { hechas, total: Math.max(total, PUBLICACIONES_POR_LECCION) };
}

export function pasosLeccion(estado: EstadoLeccion): PasosLeccion {
  const publicacion = publicacionLeccion(estado);
  return {
    voz: fraccion(estado.voz.hechas, estado.voz.total, estado.guion),
    camara: fraccion(estado.camara.hechas, estado.camara.total, estado.guion),
    video: estado.video_final ? 1 : 0,
    publicacion: fraccion(publicacion.hechas, publicacion.total, false),
  };
}

export function estadoFicha(ficha: FichaLeccion): EstadoFicha {
  if (!ficha.leccion) return "por-preparar";
  const pasos = Object.values(pasosLeccion(ficha.leccion.estado));
  if (pasos.every((p) => p >= 1)) return "terminada";
  if (pasos.some((p) => p > 0)) return "en-marcha";
  return "por-empezar";
}

export function sinAcentos(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Filtra por texto (título o módulo, sin distinguir acentos ni mayúsculas, todas las
// palabras) y por número de capítulo exacto. Un filtro vacío no filtra.
export function filtrarFichas(
  fichas: FichaLeccion[],
  texto: string,
  numero: string,
): FichaLeccion[] {
  const palabras = sinAcentos(texto).split(/\s+/).filter(Boolean);
  const numeroBuscado = numero.trim() === "" ? null : Number(numero.trim());
  return fichas.filter((ficha) => {
    if (numeroBuscado !== null && ficha.numero !== numeroBuscado) return false;
    if (palabras.length === 0) return true;
    const donde = sinAcentos(`${ficha.titulo} ${ficha.modulo ?? ""}`);
    return palabras.every((palabra) => donde.includes(palabra));
  });
}
