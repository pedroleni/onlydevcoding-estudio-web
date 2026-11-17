"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";

import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO } from "@/lib/curso";
import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";
import type { Teleprompter, Trabajo } from "@/lib/tipos";

const VERSION_VALIDA = /^[0-9a-fA-F]{64}$/;
const ESCENA_VALIDA = /^E\d{2}$/;

export interface TextosEscena {
  id: string;
  cues?: string[];
  puntos?: string[];
}

export type ResultadoGuardarTextos =
  | { ok: true; teleprompter: Teleprompter }
  | { ok: false; mensaje: string; conflicto?: true };

export type ResultadoPreviaGrabacion =
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

function textoValido(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  const recortado = valor.trim();
  const longitud = Array.from(recortado).length;
  return (
    longitud >= 1 &&
    longitud <= 1000 &&
    !/[\p{Cc}\p{Zl}\p{Zp}]/u.test(recortado)
  );
}

function normalizarLista(valor: unknown): string[] | null {
  if (!Array.isArray(valor) || !valor.every(textoValido)) return null;
  return valor.map((texto) => texto.trim());
}

function normalizarEscenas(valor: unknown): TextosEscena[] | null {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > 200) {
    return null;
  }

  const escenas: TextosEscena[] = [];
  for (const candidata of valor) {
    if (typeof candidata !== "object" || candidata === null) return null;
    const { id, cues, puntos } = candidata as Record<string, unknown>;
    if (typeof id !== "string" || !ESCENA_VALIDA.test(id)) return null;

    const cuesNormalizados = cues === undefined ? undefined : normalizarLista(cues);
    const puntosNormalizados = puntos === undefined ? undefined : normalizarLista(puntos);
    if (cuesNormalizados === null || puntosNormalizados === null) return null;

    escenas.push({
      id,
      ...(cuesNormalizados === undefined ? {} : { cues: cuesNormalizados }),
      ...(puntosNormalizados === undefined ? {} : { puntos: puntosNormalizados }),
    });
  }
  return escenas;
}

async function origenPermitido(): Promise<boolean> {
  const cabeceras = await headers();
  return (
    cabeceras.get("host") === HOST_ESTUDIO &&
    cabeceras.get("origin") === ORIGEN_ESTUDIO
  );
}

async function detalleDe(respuesta: Response): Promise<unknown> {
  try {
    const datos = (await respuesta.clone().json()) as { detail?: unknown };
    return datos.detail;
  } catch {
    try {
      return await respuesta.text();
    } catch {
      return null;
    }
  }
}

function mensajeEstado(estado: number): string {
  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado la lección",
    409: "No se puede completar la operación",
    411: "La API requiere conocer el tamaño de la petición",
    413: "La petición supera el límite de 256 KB",
    422: "Los datos enviados no son válidos",
    503: "La API tiene las escrituras desactivadas: falta ESTUDIO_TOKEN",
  };
  return mensajes[estado] ?? "La API ha rechazado la petición";
}

export async function guardarTextos(
  curso: string,
  numero: number,
  version: string,
  escenas: TextosEscena[],
): Promise<ResultadoGuardarTextos> {
  if (!destinoValido(curso, numero)) return error("La lección no es válida");
  if (typeof version !== "string" || !VERSION_VALIDA.test(version)) {
    return error("La versión del guion no es válida");
  }
  const escenasNormalizadas = normalizarEscenas(escenas);
  if (!escenasNormalizadas) return error("Los textos no son válidos");
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(
      `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/guion/textos`,
      { version, escenas: escenasNormalizadas },
      "PUT",
    );
  } catch (causa) {
    console.error("Error inesperado al guardar los textos del teleprompter", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;

  const { respuesta } = escritura;
  if (!respuesta.ok) {
    const detalle = await detalleDe(respuesta);
    const mensaje = typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status);
    return respuesta.status === 409
      ? { ok: false, mensaje, conflicto: true }
      : error(mensaje);
  }

  try {
    const teleprompter = (await respuesta.json()) as Teleprompter;
    refresh();
    return { ok: true, teleprompter };
  } catch {
    return error("La API ha devuelto una respuesta no válida");
  }
}

export async function generarPreviaGrabacion(
  curso: string,
  numero: number,
): Promise<ResultadoPreviaGrabacion> {
  if (!destinoValido(curso, numero)) return error("La lección no es válida");
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(
      `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/previa-grabacion`,
      {},
      "POST",
    );
  } catch (causa) {
    console.error("Error inesperado al generar la previa de grabación", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;

  const { respuesta } = escritura;
  if (!respuesta.ok) {
    const detalle = await detalleDe(respuesta);
    return error(
      typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status),
    );
  }

  try {
    const trabajo = (await respuesta.json()) as Trabajo;
    refresh();
    return { ok: true, trabajo };
  } catch {
    return error("La API ha devuelto una respuesta no válida");
  }
}
