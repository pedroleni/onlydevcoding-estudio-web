import {
  MENSAJE_TOKEN_AUSENTE,
  urlApi,
} from "@/lib/api-escritura";
import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;
const NUMERO_VALIDO = /^[1-9][0-9]{0,2}$/;
const ESCENA_VALIDA = /^E[0-9]{2}$/;
const SOLO_DIGITOS = /^\d+$/;
const MAXIMO_TOMA_BYTES = 209_715_200;
const MAXIMO_DIGITOS_CONTENT_LENGTH = 9;

type Contexto = {
  params: Promise<{ curso: string; numero: string; escena: string }>;
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

  const { curso, numero, escena } = await params;
  if (
    !CURSO_VALIDO.test(curso) ||
    !NUMERO_VALIDO.test(numero) ||
    !ESCENA_VALIDA.test(escena)
  ) {
    return json("La ruta no es válida", 400);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength === null || !SOLO_DIGITOS.test(contentLength)) {
    return json("Content-Length es obligatorio", 411);
  }
  if (contentLength.length > MAXIMO_DIGITOS_CONTENT_LENGTH) {
    return json("La toma supera el límite de 200 MiB", 413);
  }
  const longitud = Number(contentLength);
  if (longitud < 1) {
    return json("Content-Length no es válido", 400);
  }
  if (longitud > MAXIMO_TOMA_BYTES) {
    return json("La toma supera el límite de 200 MiB", 413);
  }
  if (request.headers.has("transfer-encoding")) {
    return json("Transfer-Encoding no está permitido", 400);
  }

  const tipoContenido = request.headers.get("content-type");
  const esenciaTipo = tipoContenido?.split(";", 1)[0].trim().toLowerCase();
  if (esenciaTipo !== "audio/wav") {
    return json("Content-Type debe ser audio/wav", 415);
  }

  const token = process.env.ESTUDIO_TOKEN;
  if (!token) {
    return json(MENSAJE_TOKEN_AUSENTE, 503);
  }

  const opciones: RequestInit & { duplex: "half" } = {
    method: "PUT",
    headers: {
      "Content-Type": "audio/wav",
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
      `${urlApi()}/api/cursos/${curso}/lecciones/${numero}/grabaciones/${escena}`,
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
