import "server-only";

import { escribir } from "@/lib/api-escritura";
import { detalleDe } from "@/lib/detalle-api";

export type ResultadoEscrituraApi =
  | { ok: true; respuesta: Response }
  | { ok: false; mensaje: string; estado?: number };

export interface OpcionesEscrituraApi {
  metodo?: "PUT" | "POST" | "DELETE";
  // Completa «Error inesperado al …» en el registro del servidor.
  contexto: string;
  // Estados cuyo `detail` de la API se enseña tal cual.
  estadosConDetalle: ReadonlySet<number>;
  mensajeEstado: (estado: number) => string;
}

// Escribe en la API y convierte cualquier fallo en un mensaje para la interfaz: sin
// conexión, sin token, o una respuesta de error (con su `detail` si es de confianza).
export async function escribirEnApi(
  ruta: string,
  cuerpo: unknown,
  { metodo = "PUT", contexto, estadosConDetalle, mensajeEstado }: OpcionesEscrituraApi,
): Promise<ResultadoEscrituraApi> {
  let escritura;
  try {
    escritura = await escribir(ruta, cuerpo, metodo);
  } catch (causa) {
    console.error(`Error inesperado al ${contexto}`, {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return { ok: false, mensaje: "No se puede conectar con la API" };
  }
  if (!escritura.ok) return escritura;

  const { respuesta } = escritura;
  if (respuesta.ok) return escritura;
  const detalle = estadosConDetalle.has(respuesta.status)
    ? await detalleDe(respuesta, { textoBruto: false })
    : undefined;
  return {
    ok: false,
    mensaje: typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status),
    estado: respuesta.status,
  };
}

// Cuerpo JSON de una respuesta correcta, o null si la API devolvió algo ilegible.
export async function leerJson<T>(respuesta: Response): Promise<T | null> {
  try {
    return (await respuesta.json()) as T;
  } catch {
    return null;
  }
}
