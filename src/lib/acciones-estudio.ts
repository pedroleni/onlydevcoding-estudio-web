"use server";

import { escribir } from "@/lib/api-escritura";
import { esIdAccion } from "@/lib/catalogo-acciones";
import { CURSO_VALIDO } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { origenPermitido } from "@/lib/origen-servidor";
import type { IdAccion, Trabajo } from "@/lib/tipos";

const PREVIA_VALIDA = /^previa-v\d{1,4}\.mp4$/;
const SHORT_VALIDO = /^[a-z0-9-]{1,60}$/;
const ESTADOS_CON_DETALLE = new Set([404, 409, 422, 503]);

export interface OpcionesAccion {
  previa?: string;
  short?: string;
}

export type ResultadoTrabajo =
  | { ok: true; trabajo: Trabajo }
  | { ok: false; mensaje: string };

function error(mensaje: string): { ok: false; mensaje: string } {
  return { ok: false, mensaje };
}

function destinoValido(curso: unknown, numero: unknown): boolean {
  return (
    typeof curso === "string" &&
    CURSO_VALIDO.test(curso) &&
    typeof numero === "number" &&
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= 999
  );
}

function normalizarOpciones(valor: unknown): OpcionesAccion | null {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return null;
  }

  const candidata = valor as Record<string, unknown>;
  const previa = candidata.previa;
  const short = candidata.short;
  if (previa !== undefined && (typeof previa !== "string" || !PREVIA_VALIDA.test(previa))) {
    return null;
  }
  if (short !== undefined && (typeof short !== "string" || !SHORT_VALIDO.test(short))) {
    return null;
  }

  return {
    ...(previa === undefined ? {} : { previa }),
    ...(short === undefined ? {} : { short }),
  };
}

function mensajeEstado(estado: number): string {
  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado la lección o el trabajo",
    409: "No se puede completar la operación",
    411: "La API requiere conocer el tamaño de la petición",
    413: "La petición supera el límite de 256 KB",
    422: "Los datos enviados no son válidos",
    503: "La acción no está disponible",
  };
  return mensajes[estado] ?? "La API ha rechazado la petición";
}

async function resolverEscritura(
  ruta: string,
  cuerpo: OpcionesAccion | Record<string, never>,
): Promise<ResultadoTrabajo> {
  let escritura;
  try {
    escritura = await escribir(ruta, cuerpo, "POST");
  } catch (causa) {
    console.error("Error inesperado al gestionar un trabajo del estudio", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;

  const { respuesta } = escritura;
  if (!respuesta.ok) {
    const detalle = ESTADOS_CON_DETALLE.has(respuesta.status)
      ? await detalleDe(respuesta, { textoBruto: false })
      : undefined;
    return error(
      typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status),
    );
  }

  try {
    return { ok: true, trabajo: (await respuesta.json()) as Trabajo };
  } catch {
    return error("La API ha devuelto una respuesta no válida");
  }
}

export async function lanzarAccion(
  curso: string,
  numero: number,
  accion: IdAccion,
  opciones: OpcionesAccion,
): Promise<ResultadoTrabajo> {
  if (!destinoValido(curso, numero)) return error("La lección no es válida");
  if (!esIdAccion(accion)) return error("La acción no es válida");
  const opcionesValidas = normalizarOpciones(opciones);
  if (!opcionesValidas) return error("Las opciones de la acción no son válidas");
  if (!(await origenPermitido())) return error("Origen no permitido");

  return resolverEscritura(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/acciones/${accion}`,
    opcionesValidas,
  );
}

export async function cancelarTrabajo(id: number): Promise<ResultadoTrabajo> {
  if (!Number.isSafeInteger(id) || id < 1) return error("El trabajo no es válido");
  if (!(await origenPermitido())) return error("Origen no permitido");

  return resolverEscritura(`/api/trabajos/${id}/cancelar`, {});
}
