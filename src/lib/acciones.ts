"use server";

import { refresh } from "next/cache";

import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO, REDES } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { errorLimitesTextos } from "@/lib/limites";
import { origenPermitido } from "@/lib/origen-servidor";
import type {
  EstadoRed,
  RedVista,
  TextosEditables,
  VistaPublicacion,
} from "@/lib/tipos";
import { errorUrlPublicacion } from "@/lib/url-publicacion";

const PIEZA_VALIDA = /^(leccion|reel-salida(-[1-9][0-9]*)?|short-[1-9][0-9]*)$/;
const REDES_VALIDAS = new Set<string>(REDES.map(([id]) => id));
const ESTADOS_VALIDOS = new Set(["pendiente", "programado", "publicado"]);
const FECHA_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/;

interface DestinoPublicacion {
  curso: string;
  numero: number;
  pieza: string;
  red: string;
}

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
  valor: unknown,
): DestinoPublicacion | ResultadoAccion {
  const destino = typeof valor === "object" && valor !== null
    ? valor as Record<string, unknown>
    : {};
  const { curso, numero, pieza, red } = destino;
  const errorPieza = validarPieza(curso, numero, pieza);
  if (errorPieza) return errorPieza;
  if (typeof red !== "string" || !REDES_VALIDAS.has(red)) {
    return { ok: false, mensaje: "La red no es válida" };
  }
  return {
    curso: curso as string,
    numero: numero as number,
    pieza: pieza as string,
    red,
  };
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
    esCadenaONull(estado.url) &&
    (estado.url === null || errorUrlPublicacion(estado.url) === null)
  );
}

function sonTextosEditables(valor: unknown): valor is TextosEditables {
  if (typeof valor !== "object" || valor === null) {
    return false;
  }
  const textos = valor as Partial<TextosEditables>;
  return (
    esListaDeCadenas(textos.titulos) &&
    esCadenaONull(textos.descripcion) &&
    esListaDeCadenas(textos.etiquetas) &&
    esCadenaONull(textos.texto) &&
    esCadenaONull(textos.comentario_fijado) &&
    esListaDeCadenas(textos.ajustes) &&
    esCadenaONull(textos.notas)
  );
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
  if (
    (respuesta.status === 409 || respuesta.status === 422) &&
    typeof detalle === "string"
  ) {
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
  if (!(await origenPermitido())) {
    return { ok: false, mensaje: "Origen no permitido" };
  }

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
  valorDestino: unknown,
  estado: unknown,
): Promise<ResultadoAccion> {
  const destino = validarDestino(valorDestino);
  if ("ok" in destino) return destino;
  if (!esEstadoRed(estado)) {
    return { ok: false, mensaje: "El estado no es válido" };
  }

  return ejecutar(
    `${rutaPieza(destino.curso, destino.numero, destino.pieza)}/redes/${encodeURIComponent(destino.red)}/estado`,
    { estado: estado.estado, fecha: estado.fecha, url: estado.url },
  );
}

export async function guardarTextos(
  valorDestino: unknown,
  textos: unknown,
): Promise<ResultadoAccion> {
  const destino = validarDestino(valorDestino);
  if ("ok" in destino) return destino;
  if (!sonTextosEditables(textos)) {
    return { ok: false, mensaje: "Los textos no son válidos" };
  }
  const errorLimites = errorLimitesTextos(destino.red as RedVista["red"], textos);
  if (errorLimites) return { ok: false, mensaje: errorLimites };

  const cuerpo: TextosEditables = {
    titulos: textos.titulos,
    descripcion: textos.descripcion,
    etiquetas: textos.etiquetas,
    texto: textos.texto,
    comentario_fijado: textos.comentario_fijado,
    ajustes: textos.ajustes,
    notas: textos.notas,
  };

  return ejecutar(
    `${rutaPieza(destino.curso, destino.numero, destino.pieza)}/redes/${encodeURIComponent(destino.red)}/textos`,
    cuerpo,
  );
}
