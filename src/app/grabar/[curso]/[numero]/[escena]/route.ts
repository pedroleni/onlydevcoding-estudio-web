import { urlApi } from "@/lib/api-escritura";
import { comprobarCuerpo, comprobarOrigen, json, reenviarSubida } from "@/lib/subida-directa";

// Subida de las tomas de voz (WAV de hasta 200 MiB). Esta ruta no pasa por el Proxy de Next
// (ver `src/proxy.ts`): las comprobaciones comunes y el reenvío en streaming con el token del
// servidor están en `@/lib/subida-directa`.

const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;
const NUMERO_VALIDO = /^[1-9][0-9]{0,2}$/;
const ESCENA_VALIDA = /^E[0-9]{2}$/;
const MAXIMO_TOMA_BYTES = 209_715_200;
const MAXIMO_DIGITOS_CONTENT_LENGTH = 9;

type Contexto = {
  params: Promise<{ curso: string; numero: string; escena: string }>;
};

export async function PUT(request: Request, { params }: Contexto): Promise<Response> {
  const sinPermiso = comprobarOrigen(request);
  if (sinPermiso) return sinPermiso;

  const { curso, numero, escena } = await params;
  if (
    !CURSO_VALIDO.test(curso) ||
    !NUMERO_VALIDO.test(numero) ||
    !ESCENA_VALIDA.test(escena)
  ) {
    return json("La ruta no es válida", 400);
  }

  const cuerpo = comprobarCuerpo(request, {
    maximoBytes: MAXIMO_TOMA_BYTES,
    maximoDigitos: MAXIMO_DIGITOS_CONTENT_LENGTH,
    mensajeTamano: "La toma supera el límite de 200 MiB",
  });
  if (!cuerpo.ok) return cuerpo.respuesta;

  const tipoContenido = request.headers.get("content-type");
  const esenciaTipo = tipoContenido?.split(";", 1)[0].trim().toLowerCase();
  if (esenciaTipo !== "audio/wav") {
    return json("Content-Type debe ser audio/wav", 415);
  }

  return reenviarSubida(request, {
    url: `${urlApi()}/api/cursos/${curso}/lecciones/${numero}/grabaciones/${escena}`,
    tipo: "audio/wav",
    contentLength: cuerpo.contentLength,
  });
}
