import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

const API_LOCAL = "http://127.0.0.1:8000";
const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;
const NUMERO_VALIDO = /^[1-9][0-9]{0,2}$/;
const ESCENA_VALIDA = /^E[0-9]{2}$/;
const CONTENT_LENGTH_VALIDO = /^[1-9][0-9]{0,8}$/;
const MAXIMO_TOMA_BYTES = 209_715_200;

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

  if (request.headers.has("transfer-encoding")) {
    return json("Transfer-Encoding no está permitido", 400);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    return json("Content-Length es obligatorio", 411);
  }
  if (!CONTENT_LENGTH_VALIDO.test(contentLength)) {
    return json("Content-Length no es válido", 400);
  }
  if (Number(contentLength) > MAXIMO_TOMA_BYTES) {
    return json("La toma supera el límite de 200 MiB", 413);
  }

  if (request.headers.get("content-type") !== "audio/wav") {
    return json("Content-Type debe ser audio/wav", 415);
  }

  const token = process.env.ESTUDIO_TOKEN;
  if (!token) {
    return json("La API tiene las escrituras desactivadas: falta ESTUDIO_TOKEN", 503);
  }

  const api = (process.env.API_URL ?? API_LOCAL).replace(/\/+$/, "");
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

  try {
    const respuesta = await fetch(
      `${api}/api/cursos/${curso}/lecciones/${numero}/grabaciones/${escena}`,
      opciones,
    );
    return new Response(await respuesta.text(), {
      status: respuesta.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return json("No se puede conectar con la API", 502);
  }
}
