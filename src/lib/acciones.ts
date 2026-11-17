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

export type ResultadoAccion =
  | { ok: true; vista: VistaPublicacion; aviso?: string }
  | { ok: false; mensaje: string };

function validarPieza(
  curso: unknown,
  numero: unknown,
  pieza: unknown,
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
  return null;
}

function validarDestino(
  curso: unknown,
  numero: unknown,
  pieza: unknown,
  red: unknown,
): ResultadoAccion | null {
  const errorPieza = validarPieza(curso, numero, pieza);
  if (errorPieza) return errorPieza;
  if (typeof red !== "string" || !REDES_VALIDAS.has(red)) {
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

function errorDeLimitesTextos(
  red: string,
  textos: TextosRed,
): ResultadoAccion | null {
  if (textos.titulos.some((titulo) => titulo.length > 100)) {
    return { ok: false, mensaje: "El campo titulos supera los 100 caracteres" };
  }
  if (textos.descripcion !== null && textos.descripcion.length > 5000) {
    return { ok: false, mensaje: "El campo descripcion supera los 5000 caracteres" };
  }
  if (textos.etiquetas.join(", ").length > 500) {
    return { ok: false, mensaje: "El campo etiquetas supera los 500 caracteres" };
  }
  const limiteTexto = red === "linkedin" ? 3000 :
    red === "instagram" || red === "tiktok" ? 2200 : null;
  if (
    limiteTexto !== null &&
    textos.texto !== null &&
    textos.texto.length > limiteTexto
  ) {
    return {
      ok: false,
      mensaje: `El campo texto supera los ${limiteTexto} caracteres`,
    };
  }
  if (
    textos.comentario_fijado !== null &&
    textos.comentario_fijado.length > 10000
  ) {
    return {
      ok: false,
      mensaje: "El campo comentario_fijado supera los 10000 caracteres",
    };
  }
  if (textos.ajustes.length > 30) {
    return { ok: false, mensaje: "El campo ajustes supera las 30 líneas" };
  }
  if (textos.ajustes.some((linea) => linea.length > 300)) {
    return {
      ok: false,
      mensaje: "El campo ajustes contiene una línea de más de 300 caracteres",
    };
  }
  return null;
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
      return vista.aviso
        ? { ok: true, vista, aviso: vista.aviso }
        : { ok: true, vista };
    } catch {
      return { ok: false, mensaje: "La API ha devuelto una respuesta no válida" };
    }
  }

  const detalle = await detalleDe(respuesta);
  if (respuesta.status === 422 && typeof detalle === "string") {
    return { ok: false, mensaje: detalle };
  }

  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado la lección o la pieza",
    409: "No se puede guardar: publicacion.json está corrupto",
    411: "La API requiere conocer el tamaño de la petición",
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
  let escritura;
  try {
    escritura = await escribir(ruta, cuerpo);
  } catch (error) {
    console.error("Error inesperado al escribir en la API", {
      tipo: error instanceof Error ? error.name : typeof error,
    });
    return { ok: false, mensaje: "No se puede conectar con la API" };
  }

  if (!escritura.ok) return escritura;
  const resultado = await resultadoDe(escritura.respuesta);
  if (resultado.ok) refresh();
  return resultado;
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
  const error = validarPieza(curso, numero, pieza);
  if (error) return error;
  if (typeof ruta !== "string" || ruta.length === 0) {
    return { ok: false, mensaje: "La ruta de la portada no es válida" };
  }
  if (ruta.length > 500) {
    return {
      ok: false,
      mensaje: "La ruta de la portada supera los 500 caracteres",
    };
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
    { estado: estado.estado, fecha: estado.fecha, url: estado.url },
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
  const errorLimites = errorDeLimitesTextos(red, textos);
  if (errorLimites) return errorLimites;

  const cuerpo: TextosRed = {
    titulos: textos.titulos,
    descripcion: textos.descripcion,
    etiquetas: textos.etiquetas,
    texto: textos.texto,
    comentario_fijado: textos.comentario_fijado,
    ajustes: textos.ajustes,
    video: textos.video,
    notas: textos.notas,
  };

  return ejecutar(
    `${rutaPieza(curso, numero, pieza)}/redes/${encodeURIComponent(red)}/textos`,
    cuerpo,
  );
}
