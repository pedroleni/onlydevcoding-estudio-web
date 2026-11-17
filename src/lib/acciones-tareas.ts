"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";

import { obtenerLeccion, obtenerLecciones } from "@/lib/api";
import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO, REDES } from "@/lib/curso";
import { esFechaValida } from "@/lib/fechas";
import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";
import type { EnlaceTarea, TareaNueva, TipoTarea } from "@/lib/tipos";

const HORA_VALIDA = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIPO_VALIDO = /^[a-z0-9-]{1,30}$/;
const PIEZA_VALIDA = /^(leccion|reel-salida(-[1-9][0-9]*)?|short-[1-9][0-9]*)$/;
const REDES_VALIDAS = new Set<string>(REDES.map(([id]) => id));
const COLORES_VALIDOS = new Set<TipoTarea["color"]>([
  "#299BC6",
  "#4BC98C",
  "#E8A33D",
  "#E5534B",
  "#A371F7",
  "#6CCBEF",
  "#F778BA",
  "#9B9BA4",
]);

type MetodoEscritura = "PUT" | "POST" | "DELETE";

export type ResultadoAccionTareas =
  | { ok: true }
  | { ok: false; mensaje: string };

type TipoNuevo = Pick<TipoTarea, "id" | "nombre" | "color" | "orden">;
type CambiosTipo = Pick<TipoTarea, "nombre" | "color" | "orden">;

function error(mensaje: string): ResultadoAccionTareas {
  return { ok: false, mensaje };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

function idPositivo(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isInteger(valor) && valor >= 1;
}

function normalizarEnlace(valor: unknown): EnlaceTarea | null | ResultadoAccionTareas {
  if (valor === undefined || valor === null) return null;
  if (!esObjeto(valor)) return error("El enlace no es válido");

  const { curso, numero, pieza, red } = valor;
  if (typeof curso !== "string" || !CURSO_VALIDO.test(curso)) {
    return error("El curso no es válido");
  }
  if (
    numero !== undefined &&
    numero !== null &&
    (typeof numero !== "number" || !Number.isInteger(numero) || numero < 1 || numero > 999)
  ) {
    return error("El número de lección no es válido");
  }
  if (
    pieza !== undefined &&
    pieza !== null &&
    (typeof pieza !== "string" || !PIEZA_VALIDA.test(pieza))
  ) {
    return error("La pieza no es válida");
  }
  if (
    red !== undefined &&
    red !== null &&
    (typeof red !== "string" || !REDES_VALIDAS.has(red))
  ) {
    return error("La red no es válida");
  }
  if (pieza != null && numero == null) {
    return error("Una pieza exige un número de lección");
  }
  if (red != null && pieza == null) {
    return error("Una red exige una pieza");
  }

  return {
    curso,
    ...(numero == null ? {} : { numero }),
    ...(pieza == null ? {} : { pieza: pieza as string }),
    ...(red == null ? {} : { red: red as EnlaceTarea["red"] }),
  };
}

function normalizarTarea(valor: unknown): TareaNueva | ResultadoAccionTareas {
  if (!esObjeto(valor)) return error("La tarea no es válida");
  const { fecha, hora, texto, tipo, enlace } = valor;
  if (typeof fecha !== "string" || !esFechaValida(fecha)) {
    return error("La fecha no es válida");
  }
  if (hora !== undefined && hora !== null && (typeof hora !== "string" || !HORA_VALIDA.test(hora))) {
    return error("La hora no es válida");
  }
  if (typeof texto !== "string") return error("El texto no es válido");
  const textoRecortado = texto.trim();
  if (
    textoRecortado.length < 1 ||
    textoRecortado.length > 300 ||
    Array.from(textoRecortado).some((caracter) => {
      const codigo = caracter.charCodeAt(0);
      return codigo < 0x20 || codigo === 0x7f;
    })
  ) {
    return error("El texto debe tener entre 1 y 300 caracteres y una sola línea");
  }
  if (typeof tipo !== "string" || !TIPO_VALIDO.test(tipo)) {
    return error("El tipo no es válido");
  }

  const enlaceNormalizado = normalizarEnlace(enlace);
  if (enlaceNormalizado && "ok" in enlaceNormalizado) return enlaceNormalizado;
  return {
    fecha,
    ...(hora == null ? {} : { hora: hora as string }),
    texto: textoRecortado,
    tipo,
    ...(enlaceNormalizado === null ? {} : { enlace: enlaceNormalizado }),
  };
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

async function resultadoDe(respuesta: Response): Promise<ResultadoAccionTareas> {
  if (respuesta.ok) return { ok: true };

  const detalle = await detalleDe(respuesta);
  if (respuesta.status >= 400 && respuesta.status < 500 && typeof detalle === "string") {
    return error(detalle);
  }
  const mensajes: Record<number, string> = {
    401: "La API ha rechazado el token de escritura",
    404: "No se ha encontrado el recurso",
    409: "No se puede completar la operación",
    411: "La API requiere conocer el tamaño de la petición",
    413: "La petición supera el límite de 256 KB",
    422: "Los datos enviados no son válidos",
    503: "La API tiene las escrituras desactivadas: falta ESTUDIO_TOKEN",
  };
  return error(mensajes[respuesta.status] ?? "La API ha rechazado la petición");
}

async function ejecutar(
  ruta: string,
  cuerpo: unknown,
  metodo: MetodoEscritura,
): Promise<ResultadoAccionTareas> {
  if (!(await origenPermitido())) return error("Origen no permitido");

  let escritura;
  try {
    escritura = await escribir(ruta, cuerpo, metodo);
  } catch (causa) {
    console.error("Error inesperado al escribir en la API", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return error("No se puede conectar con la API");
  }
  if (!escritura.ok) return escritura;

  const resultado = await resultadoDe(escritura.respuesta);
  if (resultado.ok) refresh();
  return resultado;
}

export async function crearTarea(nueva: TareaNueva): Promise<ResultadoAccionTareas> {
  const tarea = normalizarTarea(nueva);
  if ("ok" in tarea) return tarea;
  return ejecutar("/api/tareas", tarea, "POST");
}

export async function editarTarea(id: number, nueva: TareaNueva): Promise<ResultadoAccionTareas> {
  if (!idPositivo(id)) return error("La tarea no es válida");
  const tarea = normalizarTarea(nueva);
  if ("ok" in tarea) return tarea;
  return ejecutar(`/api/tareas/${id}`, tarea, "PUT");
}

export async function marcarHecha(id: number, hecha: boolean): Promise<ResultadoAccionTareas> {
  if (!idPositivo(id)) return error("La tarea no es válida");
  if (typeof hecha !== "boolean") return error("El estado de la tarea no es válido");
  return ejecutar(`/api/tareas/${id}/hecha`, { hecha }, "PUT");
}

export async function borrarTarea(id: number): Promise<ResultadoAccionTareas> {
  if (!idPositivo(id)) return error("La tarea no es válida");
  return ejecutar(`/api/tareas/${id}`, {}, "DELETE");
}

function normalizarTipo(valor: unknown, conId: true): TipoNuevo | ResultadoAccionTareas;
function normalizarTipo(valor: unknown, conId: false): CambiosTipo | ResultadoAccionTareas;
function normalizarTipo(
  valor: unknown,
  conId: boolean,
): TipoNuevo | CambiosTipo | ResultadoAccionTareas {
  if (!esObjeto(valor)) return error("El tipo de tarea no es válido");
  const { id, nombre, color, orden } = valor;
  if (conId && (typeof id !== "string" || !TIPO_VALIDO.test(id))) {
    return error("El id del tipo no es válido");
  }
  if (typeof nombre !== "string") return error("El nombre no es válido");
  const nombreRecortado = nombre.trim();
  if (nombreRecortado.length < 1 || nombreRecortado.length > 40) {
    return error("El nombre debe tener entre 1 y 40 caracteres");
  }
  if (typeof color !== "string" || !COLORES_VALIDOS.has(color as TipoTarea["color"])) {
    return error("El color no es válido");
  }
  if (typeof orden !== "number" || !Number.isInteger(orden)) {
    return error("El orden no es válido");
  }
  return {
    ...(conId ? { id: id as string } : {}),
    nombre: nombreRecortado,
    color: color as TipoTarea["color"],
    orden,
  } as TipoNuevo | CambiosTipo;
}

export async function crearTipoTarea(tipo: TipoNuevo): Promise<ResultadoAccionTareas> {
  const normalizado = normalizarTipo(tipo, true);
  if ("ok" in normalizado) return normalizado;
  return ejecutar("/api/tipos-tarea", normalizado, "POST");
}

export async function editarTipoTarea(id: string, cambios: CambiosTipo): Promise<ResultadoAccionTareas> {
  if (typeof id !== "string" || !TIPO_VALIDO.test(id)) return error("El id del tipo no es válido");
  const normalizados = normalizarTipo(cambios, false);
  if ("ok" in normalizados) return normalizados;
  return ejecutar(`/api/tipos-tarea/${encodeURIComponent(id)}`, normalizados, "PUT");
}

export async function borrarTipoTarea(id: string): Promise<ResultadoAccionTareas> {
  if (typeof id !== "string" || !TIPO_VALIDO.test(id)) return error("El id del tipo no es válido");
  return ejecutar(`/api/tipos-tarea/${encodeURIComponent(id)}`, {}, "DELETE");
}

export async function crearCurso(id: string, nombre: string): Promise<ResultadoAccionTareas> {
  if (typeof id !== "string" || !CURSO_VALIDO.test(id)) return error("El id del curso no es válido");
  if (typeof nombre !== "string") return error("El nombre no es válido");
  const nombreRecortado = nombre.trim();
  if (nombreRecortado.length < 1 || nombreRecortado.length > 60) {
    return error("El nombre debe tener entre 1 y 60 caracteres");
  }
  return ejecutar("/api/cursos", { id, nombre: nombreRecortado }, "POST");
}

export async function borrarCurso(id: string): Promise<ResultadoAccionTareas> {
  if (typeof id !== "string" || !CURSO_VALIDO.test(id)) return error("El id del curso no es válido");
  return ejecutar(`/api/cursos/${encodeURIComponent(id)}`, {}, "DELETE");
}

export async function opcionesLecciones(
  curso: string,
): Promise<{ numero: number; titulo: string }[]> {
  if (typeof curso !== "string" || !CURSO_VALIDO.test(curso)) return [];
  if (!(await origenPermitido())) return [];
  try {
    const lecciones = await obtenerLecciones(curso);
    return (lecciones ?? []).map(({ numero, titulo }) => ({ numero, titulo }));
  } catch (causa) {
    console.error("Error inesperado al leer lecciones de la API", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return [];
  }
}

export async function opcionesPiezas(
  curso: string,
  numero: number,
): Promise<{ id: string; titulo: string }[]> {
  if (
    typeof curso !== "string" ||
    !CURSO_VALIDO.test(curso) ||
    typeof numero !== "number" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 999
  ) {
    return [];
  }
  if (!(await origenPermitido())) return [];
  try {
    const leccion = await obtenerLeccion(curso, numero);
    return (leccion?.piezas ?? []).map(({ id, titulo }) => ({ id, titulo }));
  } catch (causa) {
    console.error("Error inesperado al leer piezas de la API", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return [];
  }
}
