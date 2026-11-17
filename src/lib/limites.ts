import type { RedVista, TextosRed } from "@/lib/tipos";

export const LIMITES_PUBLICACION = {
  tituloYoutube: 100,
  descripcionYoutube: 5000,
  etiquetasYoutube: 500,
  textoInstagramTikTok: 2200,
  textoLinkedIn: 3000,
  comentarioFijado: 10000,
  maximoLineas: 30,
  caracteresPorLinea: 300,
  notas: 2000,
} as const;

type RedPublicacion = RedVista["red"];

export function longitudPublicacion(valor: string): number {
  return Array.from(valor).length;
}

function supera(valor: string | null, limite: number): boolean {
  return valor !== null && longitudPublicacion(valor) > limite;
}

function contieneSalto(valor: string): boolean {
  return valor.includes("\n") || valor.includes("\r");
}

export function limiteTextoRed(red: RedPublicacion): number | null {
  if (red === "instagram" || red === "tiktok") {
    return LIMITES_PUBLICACION.textoInstagramTikTok;
  }
  if (red === "linkedin") return LIMITES_PUBLICACION.textoLinkedIn;
  return null;
}

export function errorLimitesTextos(
  red: RedPublicacion,
  textos: TextosRed,
): string | null {
  if (red === "youtube") {
    if (
      textos.titulos.some(
        (titulo) =>
          longitudPublicacion(titulo) > LIMITES_PUBLICACION.tituloYoutube,
      )
    ) {
      return `El campo titulos supera los ${LIMITES_PUBLICACION.tituloYoutube} caracteres`;
    }
    if (
      supera(textos.descripcion, LIMITES_PUBLICACION.descripcionYoutube)
    ) {
      return `El campo descripcion supera los ${LIMITES_PUBLICACION.descripcionYoutube} caracteres`;
    }
    if (
      longitudPublicacion(textos.etiquetas.join(", ")) >
      LIMITES_PUBLICACION.etiquetasYoutube
    ) {
      return `El campo etiquetas supera los ${LIMITES_PUBLICACION.etiquetasYoutube} caracteres`;
    }
  }

  const limiteTexto = limiteTextoRed(red);
  if (limiteTexto !== null && supera(textos.texto, limiteTexto)) {
    return `El campo texto supera los ${limiteTexto} caracteres`;
  }
  if (
    supera(textos.comentario_fijado, LIMITES_PUBLICACION.comentarioFijado)
  ) {
    return `El campo comentario_fijado supera los ${LIMITES_PUBLICACION.comentarioFijado} caracteres`;
  }
  if (supera(textos.notas, LIMITES_PUBLICACION.notas)) {
    return `El campo notas supera los ${LIMITES_PUBLICACION.notas} caracteres`;
  }
  if (textos.titulos.some(contieneSalto)) {
    return "El campo titulos no admite saltos de línea";
  }
  if (textos.ajustes.some(contieneSalto)) {
    return "El campo ajustes no admite saltos de línea";
  }
  if (textos.ajustes.length > LIMITES_PUBLICACION.maximoLineas) {
    return `El campo ajustes supera las ${LIMITES_PUBLICACION.maximoLineas} líneas`;
  }
  if (
    textos.ajustes.some(
      (linea) =>
        longitudPublicacion(linea) > LIMITES_PUBLICACION.caracteresPorLinea,
    )
  ) {
    return `El campo ajustes contiene una línea de más de ${LIMITES_PUBLICACION.caracteresPorLinea} caracteres`;
  }
  return null;
}
