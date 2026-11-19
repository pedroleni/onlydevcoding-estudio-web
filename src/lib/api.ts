import type {
  Curso,
  EstadoAccion,
  Leccion,
  LeccionResumen,
  ReelsCurso,
  TareasDelRango,
  Temario,
  Teleprompter,
  TipoTarea,
  Trabajo,
  VistaPublicacion,
} from "@/lib/tipos";

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

// GET sin caché a la API local. Se exporta para los módulos de lectura de cada área
// (p. ej. `camara.ts`); los errores son `ApiNoDisponible` o `ErrorApi`.
export async function pedir<T>(ruta: string): Promise<T>;
export async function pedir<T>(
  ruta: string,
  opciones: { nullEn404: true },
): Promise<T | null>;
export async function pedir<T>(
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

export function obtenerTareas(
  desde: string,
  hasta: string,
  atrasadas: boolean,
): Promise<TareasDelRango> {
  const parametros = new URLSearchParams({
    desde,
    hasta,
    atrasadas: String(atrasadas),
  });
  return pedir<TareasDelRango>(`/api/tareas?${parametros}`);
}

export function obtenerTiposTarea(): Promise<TipoTarea[]> {
  return pedir<TipoTarea[]>("/api/tipos-tarea");
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

export async function obtenerPublicacion(
  curso: string,
  numero: number,
): Promise<VistaPublicacion | null> {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    return null;
  }

  return pedir<VistaPublicacion>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/publicacion`,
    { nullEn404: true },
  );
}

export function obtenerReels(curso: string): Promise<ReelsCurso | null> {
  return pedir<ReelsCurso>(`/api/cursos/${encodeURIComponent(curso)}/reels`, {
    nullEn404: true,
  });
}

export function obtenerTemario(curso: string): Promise<Temario | null> {
  return pedir<Temario>(`/api/cursos/${encodeURIComponent(curso)}/temario`, {
    nullEn404: true,
  });
}

export async function obtenerTeleprompter(
  curso: string,
  numero: number,
): Promise<Teleprompter | null> {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    return null;
  }

  return pedir<Teleprompter>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/teleprompter`,
    { nullEn404: true },
  );
}

export async function obtenerAcciones(
  curso: string,
  numero: number,
): Promise<EstadoAccion[] | null> {
  if (!Number.isInteger(numero) || numero < 1 || numero > 999) {
    return null;
  }

  return pedir<EstadoAccion[]>(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/acciones`,
    { nullEn404: true },
  );
}

export async function obtenerTrabajos(limite = 20): Promise<Trabajo[]> {
  if (!Number.isInteger(limite) || limite < 1 || limite > 100) {
    throw new RangeError("El límite de trabajos debe estar entre 1 y 100");
  }

  const parametros = new URLSearchParams({ limite: String(limite) });
  return pedir<Trabajo[]>(`/api/trabajos?${parametros}`);
}
