import { urlApi } from "@/lib/api-escritura";
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
import { comprobarCuerpo, comprobarOrigen, json, reenviarSubida } from "@/lib/subida-directa";

// Proxy de subida de las tomas de cámara (MOV o MP4 de hasta 4 GiB). Esta ruta no pasa por el
// Proxy de Next (ver `src/proxy.ts`): las comprobaciones comunes y el reenvío en streaming con
// el token del servidor están en `@/lib/subida-directa`.

const NUMERO_VALIDO = /^[1-9][0-9]{0,2}$/;
const TIPOS = new Set<string>(TIPOS_ENTREGA);

type Contexto = {
  params: Promise<{ curso: string; numero: string; archivo: string }>;
};

export async function PUT(request: Request, { params }: Contexto): Promise<Response> {
  const sinPermiso = comprobarOrigen(request);
  if (sinPermiso) return sinPermiso;

  // `archivo` llega ya decodificado: un nombre con barras sería otra ruta, no un nombre.
  const { curso, numero, archivo } = await params;
  if (!CURSO_VALIDO.test(curso) || !NUMERO_VALIDO.test(numero) || /[/\\]/.test(archivo)) {
    return json("La ruta no es válida", 400);
  }
  if (!PATRON_ARCHIVO_ENTREGA.test(archivo)) {
    return json(MENSAJE_NOMBRE_NO_ADMITIDO, 422);
  }

  const cuerpo = comprobarCuerpo(request, {
    maximoBytes: TAMANO_MAXIMO_ENTREGA,
    maximoDigitos: MAXIMO_DIGITOS_TAMANO,
    mensajeTamano: MENSAJE_TAMANO_ENTREGA,
  });
  if (!cuerpo.ok) return cuerpo.respuesta;

  const tipoContenido = request.headers.get("content-type");
  const esenciaTipo = tipoContenido?.split(";", 1)[0].trim().toLowerCase();
  if (esenciaTipo === undefined || !TIPOS.has(esenciaTipo)) {
    return json(MENSAJE_TIPO_ENTREGA, 415);
  }

  return reenviarSubida(request, {
    url: `${urlApi()}/api/cursos/${curso}/lecciones/${numero}/entregas/${encodeURIComponent(archivo)}`,
    tipo: esenciaTipo,
    contentLength: cuerpo.contentLength,
  });
}
