"use server";

import { refresh } from "next/cache";

import { escribirEnApi, leerJson } from "@/lib/escritura-con-detalle";
import { leccionValida } from "@/lib/curso";
import { esObjeto } from "@/lib/es-objeto";
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

function normalizarEscena(valor: unknown): TextosEscena | null {
  if (!esObjeto(valor)) return null;
  const { id, cues, puntos } = valor;
  if (typeof id !== "string" || !ESCENA_VALIDA.test(id)) return null;

  const cuesNormalizados = cues === undefined ? undefined : normalizarLista(cues);
  const puntosNormalizados = puntos === undefined ? undefined : normalizarLista(puntos);
  if (cuesNormalizados === null || puntosNormalizados === null) return null;

  return {
    id,
    ...(cuesNormalizados === undefined ? {} : { cues: cuesNormalizados }),
    ...(puntosNormalizados === undefined ? {} : { puntos: puntosNormalizados }),
  };
}

function normalizarEscenas(valor: unknown): TextosEscena[] | null {
  if (!Array.isArray(valor)) return null;
  const longitud = valor.length;
  if (longitud > MAXIMO_ELEMENTOS) return null;

  const escenas: TextosEscena[] = [];
  for (let indice = 0; indice < longitud; indice += 1) {
    const escena = normalizarEscena(valor[indice]);
    if (!escena) return null;
    escenas.push(escena);
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
    if (!esObjeto(candidato)) return null;
    const { id, texto } = candidato;
    if (typeof id !== "string" || !GANCHO_VALIDO.test(id) || !textoValido(texto)) {
      return null;
    }
    ganchos.push({ id, texto: texto.trim() });
  }
  return ganchos;
}

// Hace falta al menos una escena o la lista de ganchos.
function normalizarTextos(
  escenas: unknown,
  ganchos: unknown,
): { escenas: TextosEscena[]; ganchos: TextoGancho[] | undefined } | null {
  const escenasNormalizadas = normalizarEscenas(escenas);
  const ganchosNormalizados = normalizarGanchos(ganchos);
  if (!escenasNormalizadas || ganchosNormalizados === null) return null;
  if (escenasNormalizadas.length === 0 && ganchosNormalizados === undefined) return null;
  return { escenas: escenasNormalizadas, ganchos: ganchosNormalizados };
}

type SolicitudTextos = {
  curso: string;
  numero: number;
  version: string;
  escenas: TextosEscena[];
  ganchos: TextoGancho[] | undefined;
};

// Devuelve la solicitud ya validada y normalizada, o el error que se enseña.
function validarSolicitudTextos(
  valor: unknown,
): SolicitudTextos | { ok: false; mensaje: string } {
  const { curso, numero, version, escenas, ganchos } = esObjeto(valor) ? valor : {};
  // `leccionValida` solo estrecha el tipo de `curso`; el de `numero` se comprueba aparte.
  if (!leccionValida(curso, numero) || typeof numero !== "number") {
    return error("La lección no es válida");
  }
  if (typeof version !== "string" || !VERSION_VALIDA.test(version)) {
    return error("La versión del guion no es válida");
  }
  const textos = normalizarTextos(escenas, ganchos);
  if (!textos) return error("Los textos no son válidos");
  return { curso, numero, version, ...textos };
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
  valor: unknown,
): Promise<ResultadoGuardarTextos> {
  const solicitud = validarSolicitudTextos(valor);
  if ("ok" in solicitud) return solicitud;
  if (!(await origenPermitido())) return error("Origen no permitido");

  const { curso, numero, version, escenas, ganchos } = solicitud;
  const escritura = await escribirEnApi(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/guion/textos`,
    {
      version,
      escenas,
      ...(ganchos === undefined ? {} : { ganchos }),
    },
    {
      contexto: "guardar los textos del teleprompter",
      estadosConDetalle: ESTADOS_CON_DETALLE,
      mensajeEstado,
    },
  );
  if (!escritura.ok) {
    const { mensaje } = escritura;
    // Un 409 es un conflicto de versión (se ofrece recargar), salvo cuando la lección está
    // ocupada por un trabajo: eso se enseña como un error normal.
    return escritura.estado === 409 && !mensaje.startsWith(LECCION_OCUPADA)
      ? { ok: false, mensaje, conflicto: true }
      : error(mensaje);
  }

  const teleprompter = await leerJson<Teleprompter>(escritura.respuesta);
  if (!teleprompter) return error("La API ha devuelto una respuesta no válida");
  refresh();
  return { ok: true, teleprompter };
}

export async function generarPreviaGrabacion(
  curso: string,
  numero: number,
): Promise<ResultadoPreviaGrabacion> {
  if (!leccionValida(curso, numero)) return error("La lección no es válida");
  if (!(await origenPermitido())) return error("Origen no permitido");

  const escritura = await escribirEnApi(
    `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/previa-grabacion`,
    {},
    {
      metodo: "POST",
      contexto: "generar la previa de grabación",
      estadosConDetalle: ESTADOS_CON_DETALLE,
      mensajeEstado,
    },
  );
  if (!escritura.ok) return error(escritura.mensaje);

  const trabajo = await leerJson<Trabajo>(escritura.respuesta);
  if (!trabajo) return error("La API ha devuelto una respuesta no válida");
  refresh();
  return { ok: true, trabajo };
}
