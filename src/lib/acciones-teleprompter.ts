"use server";

import { refresh } from "next/cache";

import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { origenPermitido } from "@/lib/origen-servidor";
import type { Teleprompter, Trabajo } from "@/lib/tipos";

const VERSION_VALIDA = /^[0-9a-f]{64}$/;
const ESCENA_VALIDA = /^E\d{2}$/;
const GANCHO_VALIDO = /^[A-Za-z0-9_-]{1,40}$/;
const MAXIMO_ELEMENTOS = 200;
const MAXIMO_GANCHOS = 20;
const ESTADOS_CON_DETALLE = new Set([404, 409, 422]);
const LECCION_OCUPADA = "No se puede cambiar mientras se prepara esta lección";

export interface TextosEscena {
  id: string;
  cues?: string[];
  puntos?: string[];
}

export interface TextoGancho {
  id: string;
  texto: string;
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
  if (!Array.isArray(valor)) return null;
  const longitud = valor.length;
  if (longitud > MAXIMO_ELEMENTOS) return null;

  const copia: string[] = [];
  for (let indice = 0; indice < longitud; indice += 1) {
    const texto = valor[indice];
    if (!textoValido(texto)) return null;
    copia.push(texto.trim());
  }
  return copia;
}

function normalizarEscenas(valor: unknown): TextosEscena[] | null {
  if (!Array.isArray(valor)) return null;
  const longitud = valor.length;
  if (longitud > MAXIMO_ELEMENTOS) return null;

  const escenas: TextosEscena[] = [];
  for (let indice = 0; indice < longitud; indice += 1) {
    const candidata = valor[indice];
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

function normalizarGanchos(valor: unknown): TextoGancho[] | undefined | null {
  if (valor === undefined) return undefined;
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > MAXIMO_GANCHOS) {
    return null;
  }

  const ganchos: TextoGancho[] = [];
  for (let indice = 0; indice < valor.length; indice += 1) {
    const candidato = valor[indice];
    if (typeof candidato !== "object" || candidato === null) return null;
    const { id, texto } = candidato as Record<string, unknown>;
    if (typeof id !== "string" || !GANCHO_VALIDO.test(id) || !textoValido(texto)) {
      return null;
    }
    ganchos.push({ id, texto: texto.trim() });
  }
  return ganchos;
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
  ganchos?: TextoGancho[],
): Promise<ResultadoGuardarTextos> {
  if (!destinoValido(curso, numero)) return error("La lección no es válida");
  if (typeof version !== "string" || !VERSION_VALIDA.test(version)) {
    return error("La versión del guion no es válida");
  }
  const escenasNormalizadas = normalizarEscenas(escenas);
  const ganchosNormalizados = normalizarGanchos(ganchos);
  if (
    !escenasNormalizadas ||
    ganchosNormalizados === null ||
    (escenasNormalizadas.length === 0 && ganchosNormalizados === undefined)
  ) {
    return error("Los textos no son válidos");
  }
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(
      `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/guion/textos`,
      {
        version,
        escenas: escenasNormalizadas,
        ...(ganchosNormalizados === undefined ? {} : { ganchos: ganchosNormalizados }),
      },
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
    const detalle = ESTADOS_CON_DETALLE.has(respuesta.status)
      ? await detalleDe(respuesta, { textoBruto: false })
      : undefined;
    const mensaje = typeof detalle === "string" ? detalle : mensajeEstado(respuesta.status);
    // Un 409 es un conflicto de versión (se ofrece recargar), salvo cuando la lección está
    // ocupada por un trabajo: eso se enseña como un error normal.
    return respuesta.status === 409 && !mensaje.startsWith(LECCION_OCUPADA)
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
    const detalle = ESTADOS_CON_DETALLE.has(respuesta.status)
      ? await detalleDe(respuesta, { textoBruto: false })
      : undefined;
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
