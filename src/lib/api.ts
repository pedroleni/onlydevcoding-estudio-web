import type { Curso, Leccion, LeccionResumen } from "@/lib/tipos";

const API_LOCAL = "http://127.0.0.1:8000";

export class ApiNoDisponible extends Error {
  constructor(message = "No se puede conectar con la API", options?: ErrorOptions) {
    super(message, options);
    this.name = "ApiNoDisponible";
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

async function pedir<T>(ruta: string): Promise<T> {
  let respuesta: Response;

  try {
    respuesta = await fetch(`${urlApiServidor()}${ruta}`, {
      cache: "no-store",
    });
  } catch (cause) {
    throw new ApiNoDisponible(undefined, { cause });
  }

  if (!respuesta.ok) {
    throw new ApiNoDisponible(`La API ha respondido con ${respuesta.status}`);
  }

  return (await respuesta.json()) as T;
}

export function obtenerCursos(): Promise<Curso[]> {
  return pedir<Curso[]>("/api/cursos");
}

export async function obtenerLecciones(
  curso: string,
): Promise<LeccionResumen[] | null> {
  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${urlApiServidor()}/api/cursos/${encodeURIComponent(curso)}/lecciones`,
      { cache: "no-store" },
    );
  } catch (cause) {
    throw new ApiNoDisponible(undefined, { cause });
  }

  if (respuesta.status === 404) {
    return null;
  }

  if (!respuesta.ok) {
    throw new ApiNoDisponible(`La API ha respondido con ${respuesta.status}`);
  }

  return (await respuesta.json()) as LeccionResumen[];
}

export async function obtenerLeccion(
  curso: string,
  numero: number,
): Promise<Leccion | null> {
  let respuesta: Response;

  try {
    respuesta = await fetch(
      `${urlApiServidor()}/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}`,
      { cache: "no-store" },
    );
  } catch (cause) {
    throw new ApiNoDisponible(undefined, { cause });
  }

  if (respuesta.status === 404) {
    return null;
  }

  if (!respuesta.ok) {
    throw new ApiNoDisponible(`La API ha respondido con ${respuesta.status}`);
  }

  return (await respuesta.json()) as Leccion;
}

export function urlMedio(ruta: string): string {
  return `${urlApiPublica()}/api/medios?ruta=${encodeURIComponent(ruta)}`;
}
