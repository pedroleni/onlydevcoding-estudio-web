import { MENSAJE_TOKEN_AUSENTE, urlApi } from "@/lib/api-escritura";
import { CURSO_VALIDO } from "@/lib/curso";
import {
  MAXIMO_DIGITOS_TAMANO,
  MENSAJE_NOMBRE_NO_ADMITIDO,
  MENSAJE_TAMANO_ENTREGA,
  MENSAJE_TIPO_ENTREGA,
  PATRON_ARCHIVO_ENTREGA,
  TAMANO_MAXIMO_ENTREGA,
  TIPOS_ENTREGA,
} from "@/lib/entregas";
import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

// Proxy de subida de las tomas de cámara (MOV o MP4 de hasta 4 GiB). Esta ruta no pasa por el
// Proxy de Next (ver `src/proxy.ts`): comprueba aquí mismo el `Host` y el `Origin` exactos y
// reenvía el cuerpo en streaming, sin guardarlo en memoria, con el token que solo tiene el servidor.

const NUMERO_VALIDO = /^[1-9][0-9]{0,2}$/;
const SOLO_DIGITOS = /^\d+$/;
const TIPOS = new Set<string>(TIPOS_ENTREGA);

type Contexto = {
  params: Promise<{ curso: string; numero: string; archivo: string }>;
};

function json(detail: string, status: number): Response {
  return Response.json({ detail }, { status });
}

export async function PUT(request: Request, { params }: Contexto): Promise<Response> {
  if (
    request.headers.get("host") !== HOST_ESTUDIO ||
    request.headers.get("origin") !== ORIGEN_ESTUDIO
  ) {
    return json("Origen no permitido", 403);
  }

  // `archivo` llega ya decodificado: un nombre con barras sería otra ruta, no un nombre.
  const { curso, numero, archivo } = await params;
  if (!CURSO_VALIDO.test(curso) || !NUMERO_VALIDO.test(numero) || /[/\\]/.test(archivo)) {
    return json("La ruta no es válida", 400);
  }
  if (!PATRON_ARCHIVO_ENTREGA.test(archivo)) {
    return json(MENSAJE_NOMBRE_NO_ADMITIDO, 422);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength === null || !SOLO_DIGITOS.test(contentLength)) {
    return json("Content-Length es obligatorio", 411);
  }
  if (contentLength.length > MAXIMO_DIGITOS_TAMANO) {
    return json(MENSAJE_TAMANO_ENTREGA, 413);
  }
  const longitud = Number(contentLength);
  if (longitud < 1) {
    return json("Content-Length no es válido", 400);
  }
  if (longitud > TAMANO_MAXIMO_ENTREGA) {
    return json(MENSAJE_TAMANO_ENTREGA, 413);
  }
  if (request.headers.has("transfer-encoding")) {
    return json("Transfer-Encoding no está permitido", 400);
  }

  const tipoContenido = request.headers.get("content-type");
  const esenciaTipo = tipoContenido?.split(";", 1)[0].trim().toLowerCase();
  if (esenciaTipo === undefined || !TIPOS.has(esenciaTipo)) {
    return json(MENSAJE_TIPO_ENTREGA, 415);
  }

  const token = process.env.ESTUDIO_TOKEN;
  if (!token) {
    return json(MENSAJE_TOKEN_AUSENTE, 503);
  }

  const opciones: RequestInit & { duplex: "half" } = {
    method: "PUT",
    headers: {
      "Content-Type": esenciaTipo,
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
    respuesta = await fetch(
      `${urlApi()}/api/cursos/${curso}/lecciones/${numero}/entregas/${encodeURIComponent(archivo)}`,
      opciones,
    );
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
