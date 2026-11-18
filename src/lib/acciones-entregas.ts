"use server";

import { escribir, urlApi } from "@/lib/api-escritura";
import { CURSO_VALIDO } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { esNombreEntrega } from "@/lib/entregas";
import { origenPermitido } from "@/lib/origen-servidor";
import type { AsignacionToma, Entregas, ResultadoColocar } from "@/lib/tipos";

// Lo mismo que acepta la API en `/entregas/colocar` (`max_length=200`).
const MAXIMO_ASIGNACIONES = 200;
// Destinos cerrados: una escena de cámara (E08), el cierre o el id de un gancho. La API admite
// hasta 100 caracteres libres; aquí no se reenvía nada que no tenga forma de id.
const DESTINO_VALIDO = /^(?:E[0-9]{2}|cierre|[A-Za-z0-9_-]{1,40})$/;
const ESTADOS_CON_DETALLE = new Set([404, 409, 422, 503]);

type Fallo = { ok: false; mensaje: string };

export type ResultadoLeerEntregas = { ok: true; entregas: Entregas } | Fallo;
export type ResultadoQuitarEntrega = { ok: true } | Fallo;
export type ResultadoColocarTomas = { ok: true; resultado: ResultadoColocar } | Fallo;

function error(mensaje: string): Fallo {
  return { ok: false, mensaje };
}

function leccionValida(curso: unknown, numero: unknown): curso is string {
  return (
    typeof curso === "string" &&
    CURSO_VALIDO.test(curso) &&
    typeof numero === "number" &&
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= 999
  );
}

function rutaEntregas(curso: string, numero: number): string {
  return `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/entregas`;
}

function mensajeEstado(estado: number): string {
  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado la lección o la toma",
    409: "No se puede completar la operación",
    413: "La petición supera el límite de 256 KB",
    422: "Los datos enviados no son válidos",
    503: "Las tomas no están disponibles",
  };
  return mensajes[estado] ?? "La API ha rechazado la petición";
}

async function errorDeRespuesta(respuesta: Response): Promise<Fallo> {
  const detalle = ESTADOS_CON_DETALLE.has(respuesta.status)
    ? await detalleDe(respuesta, { textoBruto: false })
    : undefined;
  return error(typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status));
}

function registrarFallo(causa: unknown) {
  console.error("Error inesperado al gestionar las tomas entregadas", {
    tipo: causa instanceof Error ? causa.name : typeof causa,
  });
}

function normalizarAsignaciones(valor: unknown): AsignacionToma[] | null {
  if (!Array.isArray(valor) || valor.length > MAXIMO_ASIGNACIONES) return null;
  const asignaciones: AsignacionToma[] = [];
  for (const elemento of valor) {
    if (typeof elemento !== "object" || elemento === null || Array.isArray(elemento)) {
      return null;
    }
    const claves = Object.keys(elemento);
    if (claves.some((clave) => clave !== "archivo" && clave !== "destino")) return null;
    const { archivo, destino } = elemento as Record<string, unknown>;
    if (!esNombreEntrega(archivo)) return null;
    if (destino !== null && (typeof destino !== "string" || !DESTINO_VALIDO.test(destino))) {
      return null;
    }
    asignaciones.push({ archivo, destino });
  }
  return asignaciones;
}

export async function leerEntregas(
  curso: string,
  numero: number,
): Promise<ResultadoLeerEntregas> {
  if (!leccionValida(curso, numero)) return error("La lección no es válida");
  if (!(await origenPermitido())) return error("Origen no permitido");

  let respuesta: Response;
  try {
    respuesta = await fetch(`${urlApi()}${rutaEntregas(curso, numero)}`, {
      cache: "no-store",
      redirect: "error",
    });
  } catch (causa) {
    registrarFallo(causa);
    return error("No se puede conectar con la API");
  }
  if (!respuesta.ok) return errorDeRespuesta(respuesta);

  try {
    return { ok: true, entregas: (await respuesta.json()) as Entregas };
  } catch {
    return error("La API ha devuelto una respuesta no válida");
  }
}

export async function quitarEntrega(
  curso: string,
  numero: number,
  archivo: string,
): Promise<ResultadoQuitarEntrega> {
  if (!leccionValida(curso, numero)) return error("La lección no es válida");
  if (!esNombreEntrega(archivo)) return error("La toma no es válida");
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(
      `${rutaEntregas(curso, numero)}/${encodeURIComponent(archivo)}`,
      {},
      "DELETE",
    );
  } catch (causa) {
    registrarFallo(causa);
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;
  if (!escritura.respuesta.ok) return errorDeRespuesta(escritura.respuesta);
  return { ok: true };
}

export async function colocarTomas(
  curso: string,
  numero: number,
  asignaciones: AsignacionToma[],
): Promise<ResultadoColocarTomas> {
  if (!leccionValida(curso, numero)) return error("La lección no es válida");
  const validas = normalizarAsignaciones(asignaciones);
  if (!validas) return error("Las tomas que se van a colocar no son válidas");
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(
      `${rutaEntregas(curso, numero)}/colocar`,
      { asignaciones: validas },
      "POST",
    );
  } catch (causa) {
    registrarFallo(causa);
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;
  if (!escritura.respuesta.ok) return errorDeRespuesta(escritura.respuesta);

  try {
    return { ok: true, resultado: (await escritura.respuesta.json()) as ResultadoColocar };
  } catch {
    return error("La API ha devuelto una respuesta no válida");
  }
}
