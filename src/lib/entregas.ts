// Reglas de las tomas de cámara entregadas, las mismas que aplica la API. Las usan el navegador
// (para no subir 4 GiB que se van a rechazar), el proxy de subida y las Server Actions.

// Mismo patrón que la API: la extensión, sin distinguir mayúsculas; el resto, tal cual.
export const PATRON_ARCHIVO_ENTREGA =
  /^[A-Za-z0-9_(][A-Za-z0-9 _().-]{0,115}\.(?:[mM][oO][vV]|[mM][pP]4)$/;

export const TAMANO_MAXIMO_ENTREGA = 4_294_967_296;
export const MAXIMO_DIGITOS_TAMANO = 10;

export const TIPOS_ENTREGA = ["video/quicktime", "video/mp4"] as const;

export const MENSAJE_NOMBRE_NO_ADMITIDO =
  "Ese nombre de archivo no se admite: renómbralo con letras sin acentos, números, espacios, guiones o puntos";
export const MENSAJE_TAMANO_ENTREGA = "La toma supera el límite de 4 GiB";
export const MENSAJE_TIPO_ENTREGA = "La toma tiene que ser un vídeo MOV o MP4";
export const MENSAJE_NO_ES_VIDEO = "El archivo no es un vídeo MOV o MP4";

export function esNombreEntrega(valor: unknown): valor is string {
  return typeof valor === "string" && PATRON_ARCHIVO_ENTREGA.test(valor);
}

// Tipo que se manda a la API según la extensión (el navegador a veces no da ninguno).
export function tipoEntrega(nombre: string): (typeof TIPOS_ENTREGA)[number] | null {
  const extension = nombre.slice(nombre.lastIndexOf(".") + 1).toLowerCase();
  if (extension === "mov") return "video/quicktime";
  if (extension === "mp4") return "video/mp4";
  return null;
}
