import type { Curso, Leccion, LeccionResumen } from "@/lib/tipos";

const API_LOCAL = "http://127.0.0.1:8000";

export class ApiNoDisponible extends Error {
  constructor(message = "No se puede conectar con la API", options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiNoDisponible";
  }
}

export class ErrorApi extends Error {
  readonly estado: number;

  constructor(estado: number) {
    super(`La API ha rechazado la petición (estado ${estado})`);
    this.name = "ErrorApi";
    this.estado = estado;
  }
}

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

function urlApiServidor(): string {
  return sinBarraFinal(process.env.API_URL ?? API_LOCAL);
}

function urlApiPublica(): string {
  return sinBarraFinal(process.env.NEXT_PUBLIC_API_URL ?? API_LOCAL);
}

async function pedir<T>(ruta: string): Promise<T>;
async function pedir<T>(
  ruta: string,
  opciones: { nullEn404: true },
): Promise<T | null>;
async function pedir<T>(
  ruta: string,
  opciones: { nullEn404?: boolean } = {},
): Promise<T | null> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${urlApiServidor()}${ruta}`, {
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiNoDisponible(undefined, { cause });
  }

  if (respuesta.status === 404 && opciones.nullEn404) {
    return null;
  }

  if (respuesta.status >= 500) {
    throw new ApiNoDisponible();
  }

  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status);
  }

  try {
    return (await respuesta.json()) as T;
  } catch (cause) {
    throw new ApiNoDisponible("Respuesta de la API no válida", { cause });
  }
}

export function obtenerCursos(): Promise<Curso[]> {
  return pedir<Curso[]>("/api/cursos");
}

export async function obtenerLecciones(
  curso: string,
): Promise<LeccionResumen[] | null> {
  return pedir<LeccionResumen[]>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones`,
    { nullEn404: true },
  );
}

export async function obtenerLeccion(
  curso: string,
  numero: number,
): Promise<Leccion | null> {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    return null;
  }

  return pedir<Leccion>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}`,
    { nullEn404: true },
  );
}

export function urlMedio(ruta: string): string {
  return `${urlApiPublica()}/api/medios?ruta=${encodeURIComponent(ruta)}`;
}
