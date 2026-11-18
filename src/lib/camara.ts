import { pedir } from "@/lib/api";
import type { TomasCamara } from "@/lib/tipos";

// Tomas a cámara y de los ganchos de una lección. null si la lección no existe.
export async function obtenerCamara(
  curso: string,
  numero: number,
): Promise<TomasCamara | null> {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    return null;
  }

  return pedir<TomasCamara>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/camara`,
    { nullEn404: true },
  );
}
