const NOMBRE_PREVIA = /(?:^|\/)previa-v(\d+)\.mp4$/;

// El número de `previa-vN.mp4` (con o sin carpeta delante), o null si el nombre no sigue el patrón.
export function numeroPrevia(ruta: string): number | null {
  const coincidencia = ruta.match(NOMBRE_PREVIA);
  return coincidencia ? Number(coincidencia[1]) : null;
}
