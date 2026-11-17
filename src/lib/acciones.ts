"use server";

import { refresh } from "next/cache";

import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO, REDES } from "@/lib/curso";
import type {
  EstadoRed,
  TextosRed,
  VistaPublicacion,
} from "@/lib/tipos";

const PIEZA_VALIDA = /^(leccion|reel-salida(-[1-9][0-9]*)?|short-[1-9][0-9]*)$/;
const REDES_VALIDAS = new Set<string>(REDES.map(([id]) => id));
const ESTADOS_VALIDOS = new Set(["pendiente", "programado", "publicado"]);
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;
const MENSAJE_TOKEN_AUSENTE = "Falta ESTUDIO_TOKEN en el .env de la web";

export type ResultadoAccion =
  | { ok: true; vista: VistaPublicacion; aviso?: string }
  | { ok: false; mensaje: string };

function validarDestino(
  curso: unknown,
  numero: unknown,
  pieza: unknown,
  red?: unknown,
): ResultadoAccion | null {
  if (typeof curso !== "string" || !CURSO_VALIDO.test(curso)) {
    return { ok: false, mensaje: "El curso no es válido" };
  }
  if (
    typeof numero !== "number" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 999
  ) {
    return { ok: false, mensaje: "El número de lección no es válido" };
  }
  if (typeof pieza !== "string" || !PIEZA_VALIDA.test(pieza)) {
    return { ok: false, mensaje: "La pieza no es válida" };
  }
  if (red !== undefined && (typeof red !== "string" || !REDES_VALIDAS.has(red))) {
    return { ok: false, mensaje: "La red no es válida" };
  }
  return null;
}

function esCadenaONull(valor: unknown): valor is string | null {
  return valor === null || typeof valor === "string";
}

function esListaDeCadenas(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((elemento) => typeof elemento === "string");
}

function esEstadoRed(valor: unknown): valor is EstadoRed {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const estado = valor as Partial<EstadoRed>;
  return (
    typeof estado.estado === "string" &&
    ESTADOS_VALIDOS.has(estado.estado) &&
    esCadenaONull(estado.fecha) &&
    (estado.fecha === null || FECHA_ISO.test(estado.fecha)) &&
    esCadenaONull(estado.url)
  );
}

function sonTextosRed(valor: unknown): valor is TextosRed {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const textos = valor as Partial<TextosRed>;
  return (
    esListaDeCadenas(textos.titulos) &&
    esCadenaONull(textos.descripcion) &&
    esListaDeCadenas(textos.etiquetas) &&
    esCadenaONull(textos.texto) &&
    esCadenaONull(textos.comentario_fijado) &&
    esListaDeCadenas(textos.ajustes) &&
    esCadenaONull(textos.video) &&
    esCadenaONull(textos.notas)
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

async function resultadoDe(respuesta: Response): Promise<ResultadoAccion> {
  if (respuesta.ok) {
    try {
      const vista = (await respuesta.json()) as VistaPublicacion;
      refresh();
      return vista.aviso
        ? { ok: true, vista, aviso: vista.aviso }
        : { ok: true, vista };
    } catch {
      return { ok: false, mensaje: "La API ha devuelto una respuesta no válida" };
    }
  }

  const detalle = await detalleDe(respuesta);
  if (respuesta.status === 503 && detalle === MENSAJE_TOKEN_AUSENTE) {
    return { ok: false, mensaje: MENSAJE_TOKEN_AUSENTE };
  }

  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado la lección o la pieza",
    409: "No se puede guardar: publicacion.json está corrupto",
    413: "La petición supera el límite de 256 KB",
    422: "Los datos enviados no son válidos",
    503: "La API tiene las escrituras desactivadas: falta ESTUDIO_TOKEN",
  };
  return {
    ok: false,
    mensaje: mensajes[respuesta.status] ?? "La API ha rechazado la petición",
  };
}

async function ejecutar(ruta: string, cuerpo: unknown): Promise<ResultadoAccion> {
  try {
    return await resultadoDe(await escribir(ruta, cuerpo));
  } catch {
    return { ok: false, mensaje: "No se puede conectar con la API" };
  }
}

function rutaPieza(curso: string, numero: number, pieza: string): string {
  return `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/publicacion/piezas/${encodeURIComponent(pieza)}`;
}

export async function elegirPortada(
  curso: string,
  numero: number,
  pieza: string,
  ruta: string,
): Promise<ResultadoAccion> {
  const error = validarDestino(curso, numero, pieza);
  if (error) return error;
  if (typeof ruta !== "string" || ruta.length === 0) {
    return { ok: false, mensaje: "La ruta de la portada no es válida" };
  }

  return ejecutar(`${rutaPieza(curso, numero, pieza)}/portada`, { ruta });
}

export async function cambiarEstado(
  curso: string,
  numero: number,
  pieza: string,
  red: string,
  estado: EstadoRed,
): Promise<ResultadoAccion> {
  const error = validarDestino(curso, numero, pieza, red);
  if (error) return error;
  if (!esEstadoRed(estado)) {
    return { ok: false, mensaje: "El estado no es válido" };
  }

  return ejecutar(
    `${rutaPieza(curso, numero, pieza)}/redes/${encodeURIComponent(red)}/estado`,
    estado,
  );
}

export async function guardarTextos(
  curso: string,
  numero: number,
  pieza: string,
  red: string,
  textos: TextosRed,
): Promise<ResultadoAccion> {
  const error = validarDestino(curso, numero, pieza, red);
  if (error) return error;
  if (!sonTextosRed(textos)) {
    return { ok: false, mensaje: "Los textos no son válidos" };
  }

  return ejecutar(
    `${rutaPieza(curso, numero, pieza)}/redes/${encodeURIComponent(red)}/textos`,
    textos,
  );
}
