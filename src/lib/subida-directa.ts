import "server-only";

import { MENSAJE_TOKEN_AUSENTE } from "@/lib/api-escritura";
import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

// Lo común de las rutas de subida que no pasan por el Proxy de Next (ver `src/proxy.ts`):
// comprueban aquí mismo el `Host` y el `Origin` exactos y el tamaño declarado, y reenvían el
// cuerpo en streaming, sin guardarlo en memoria, con el token que solo tiene el servidor.

const SOLO_DIGITOS = /^\d+$/;

export function json(detail: string, status: number): Response {
  return Response.json({ detail }, { status });
}

// Comparación exacta: un `Origin: null`, dos cabeceras (que llegan unidas con coma) o un origen
// con barra final no son el del estudio.
export function comprobarOrigen(request: Request): Response | null {
  if (
    request.headers.get("host") !== HOST_ESTUDIO ||
    request.headers.get("origin") !== ORIGEN_ESTUDIO
  ) {
    return json("Origen no permitido", 403);
  }
  return null;
}

export interface LimitesCuerpo {
  maximoBytes: number;
  // Más dígitos que estos ya es demasiado grande, aunque lleve ceros delante.
  maximoDigitos: number;
  mensajeTamano: string;
}

export type CuerpoComprobado =
  | { ok: true; contentLength: string }
  | { ok: false; respuesta: Response };

export function comprobarCuerpo(request: Request, limites: LimitesCuerpo): CuerpoComprobado {
  const fallo = (detail: string, status: number): CuerpoComprobado => ({
    ok: false,
    respuesta: json(detail, status),
  });
  const contentLength = request.headers.get("content-length");
  if (contentLength === null || !SOLO_DIGITOS.test(contentLength)) {
    return fallo("Content-Length es obligatorio", 411);
  }
  if (contentLength.length > limites.maximoDigitos) {
    return fallo(limites.mensajeTamano, 413);
  }
  const longitud = Number(contentLength);
  if (longitud < 1) {
    return fallo("Content-Length no es válido", 400);
  }
  if (longitud > limites.maximoBytes) {
    return fallo(limites.mensajeTamano, 413);
  }
  if (request.headers.has("transfer-encoding")) {
    return fallo("Transfer-Encoding no está permitido", 400);
  }
  return { ok: true, contentLength };
}

// Las cabeceras se construyen desde cero: nada de lo que mande el cliente (tampoco un
// `X-Estudio-Token` propio) llega a la API. De la respuesta solo se copia el Content-Type.
export async function reenviarSubida(
  request: Request,
  { url, tipo, contentLength }: { url: string; tipo: string; contentLength: string },
): Promise<Response> {
  const token = process.env.ESTUDIO_TOKEN;
  if (!token) {
    return json(MENSAJE_TOKEN_AUSENTE, 503);
  }

  const opciones: RequestInit & { duplex: "half" } = {
    method: "PUT",
    headers: {
      "Content-Type": tipo,
      "Content-Length": contentLength,
      "X-Estudio-Token": token,
    },
    body: request.body,
    cache: "no-store",
    redirect: "error",
    duplex: "half",
  };

  let respuesta: Response;
  try {
    respuesta = await fetch(url, opciones);
  } catch {
    return json("No se puede conectar con la API", 502);
  }

  const cabeceras = new Headers();
  const tipoRespuesta = respuesta.headers.get("content-type");
  if (tipoRespuesta !== null) {
    cabeceras.set("Content-Type", tipoRespuesta);
  }
  const sinCuerpo = respuesta.status === 204 || respuesta.status === 304;
  return new Response(sinCuerpo ? null : respuesta.body, {
    status: respuesta.status,
    headers: cabeceras,
  });
}
