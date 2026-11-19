import { COLORES_TAREA } from "@/lib/colores-tareas";
import { CURSO_VALIDO, REDES } from "@/lib/curso";
import { esFechaValida, lunesDe, sumarDias } from "@/lib/fechas";
import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";

export const SIN_CURSO = "sin-curso";
export const COLOR_DESCONOCIDO = "#9B9BA4";

const COLORES_VALIDOS = new Set<string>(
  COLORES_TAREA.map(({ valor }) => valor),
);

// El color va a un atributo style: solo se aceptan los de la lista cerrada.
export function colorSeguro(color: string): TipoTarea["color"] {
  return COLORES_VALIDOS.has(color)
    ? (color as TipoTarea["color"])
    : COLOR_DESCONOCIDO;
}

const TIPO_VALIDO = /^[a-z0-9-]{1,30}$/;
const FECHA = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

// «todas»: la lista total de tareas sin día, agrupada por lección.
type VistaTareas = "dia" | "semana" | "todas";

export interface ParametrosTareas {
  vista: VistaTareas;
  dia: string;
  curso: string | null;
  tipo: string | null;
}

interface GrupoTipo {
  tipo: TipoTarea;
  tareas: TareaVista[];
}

export interface GrupoCurso {
  curso: string | null;
  nombre: string;
  tipos: GrupoTipo[];
}

type Consulta = Record<string, string | string[] | undefined>;

function primero(valor: string | string[] | undefined): string | undefined {
  return Array.isArray(valor) ? valor[0] : valor;
}

export function leerParametrosTareas(
  consulta: Consulta,
  hoy: string,
): ParametrosTareas {
  const vista = primero(consulta.vista);
  const dia = primero(consulta.dia);
  const curso = primero(consulta.curso);
  const tipo = primero(consulta.tipo);

  const vistaFinal: VistaTareas =
    vista === "semana" || vista === "todas" ? vista : "dia";
  const diaValido = dia !== undefined && FECHA.test(dia) && esFechaValida(dia);
  // Una semana que acaba después del 9999-12-31 no se puede pedir a la API.
  const semanaValida =
    !diaValido ||
    vistaFinal !== "semana" ||
    FECHA.test(sumarDias(lunesDe(dia), 6));

  return {
    vista: vistaFinal,
    dia: diaValido && semanaValida ? dia : hoy,
    curso:
      curso !== undefined && (curso === SIN_CURSO || CURSO_VALIDO.test(curso))
        ? curso
        : null,
    tipo: tipo !== undefined && TIPO_VALIDO.test(tipo) ? tipo : null,
  };
}

export function hrefTareas(
  actuales: ParametrosTareas,
  cambios: Partial<ParametrosTareas>,
): string {
  const { vista, dia, curso, tipo } = { ...actuales, ...cambios };
  const consulta = new URLSearchParams({ vista, dia });
  if (curso) consulta.set("curso", curso);
  if (tipo) consulta.set("tipo", tipo);
  return `/tareas?${consulta.toString()}`;
}

export function filtrarTareas(
  tareas: TareaVista[],
  curso: string | null,
  tipo: string | null,
): TareaVista[] {
  return tareas.filter((tarea) => {
    if (tipo !== null && tarea.tipo !== tipo) return false;
    if (curso === SIN_CURSO) return tarea.enlace === null;
    if (curso !== null) return tarea.enlace?.curso === curso;
    return true;
  });
}

export function compararTareas(a: TareaVista, b: TareaVista): number {
  if (a.hora !== b.hora) {
    if (a.hora === null) return 1;
    if (b.hora === null) return -1;
    return a.hora < b.hora ? -1 : 1;
  }
  return a.id - b.id;
}

function tipoDesconocido(id: string): TipoTarea {
  return {
    id,
    nombre: id,
    color: COLOR_DESCONOCIDO,
    orden: Number.MAX_SAFE_INTEGER,
  };
}

export function agruparDia(
  tareas: TareaVista[],
  cursos: Curso[],
  tipos: TipoTarea[],
): GrupoCurso[] {
  const porCurso = new Map<string | null, TareaVista[]>();
  for (const tarea of tareas) {
    const clave = tarea.enlace?.curso ?? null;
    porCurso.set(clave, [...(porCurso.get(clave) ?? []), tarea]);
  }

  const ordenCursos: (string | null)[] = [
    ...cursos.map(({ id }) => id).filter((id) => porCurso.has(id)),
    ...[...porCurso.keys()].filter(
      (id): id is string =>
        id !== null && !cursos.some((curso) => curso.id === id),
    ),
    ...(porCurso.has(null) ? [null] : []),
  ];

  const tiposPorId = new Map(tipos.map((tipo) => [tipo.id, tipo]));

  return ordenCursos.map((curso) => {
    const delCurso = porCurso.get(curso) ?? [];
    const porTipo = new Map<string, TareaVista[]>();
    for (const tarea of delCurso) {
      porTipo.set(tarea.tipo, [...(porTipo.get(tarea.tipo) ?? []), tarea]);
    }

    const grupos = [...porTipo.entries()]
      .map(([id, lista]) => ({
        tipo: ((tipo) => ({ ...tipo, color: colorSeguro(tipo.color) }))(
          tiposPorId.get(id) ?? tipoDesconocido(id),
        ),
        tareas: [...lista].sort(compararTareas),
      }))
      .sort(
        (a, b) =>
          a.tipo.orden - b.tipo.orden || a.tipo.id.localeCompare(b.tipo.id),
      );

    const nombre =
      curso === null
        ? "Sin curso"
        : (cursos.find(({ id }) => id === curso)?.nombre ??
          delCurso.find((tarea) => tarea.enlace_vista?.curso_nombre)
            ?.enlace_vista?.curso_nombre ??
          curso);

    return { curso, nombre, tipos: grupos };
  });
}

export interface GrupoLeccion {
  clave: string;
  curso: string | null;
  numero: number | null;
  titulo: string;
  tareas: TareaVista[];
  hechas: number;
}

// Título de la lección (o del curso, o «Sin curso») a la que va enlazada la tarea.
function tituloGrupo(tarea: TareaVista): string {
  const enlace = tarea.enlace;
  if (enlace === null) return "Sin curso";
  const vista = tarea.enlace_vista;
  if (enlace.numero === null || enlace.numero === undefined) {
    return vista?.curso_nombre ?? enlace.curso;
  }
  return `${enlace.numero} · ${vista?.leccion_titulo ?? `Lección ${enlace.numero}`}`;
}

// Agrupa la lista total por curso y lección, en el orden en que llega de la API.
export function agruparPorLeccion(tareas: TareaVista[]): GrupoLeccion[] {
  const grupos = new Map<string, GrupoLeccion>();
  for (const tarea of tareas) {
    const curso = tarea.enlace?.curso ?? null;
    const numero = tarea.enlace?.numero ?? null;
    const clave = `${curso ?? ""}|${numero ?? ""}`;
    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = {
        clave,
        curso,
        numero,
        titulo: tituloGrupo(tarea),
        tareas: [],
        hechas: 0,
      };
      grupos.set(clave, grupo);
    }
    grupo.tareas.push(tarea);
    if (tarea.hecha) grupo.hechas += 1;
  }
  return [...grupos.values()];
}

export function hrefEnlace(tarea: TareaVista): string | null {
  const enlace = tarea.enlace;
  if (enlace === null || tarea.enlace_vista?.roto) return null;
  if (!CURSO_VALIDO.test(enlace.curso)) return null;

  const curso = encodeURIComponent(enlace.curso);
  if (enlace.numero === null || enlace.numero === undefined) {
    return `/cursos/${curso}`;
  }
  if (
    !Number.isInteger(enlace.numero) ||
    enlace.numero < 1 ||
    enlace.numero > 999
  ) {
    return null;
  }

  const base = `/cursos/${curso}/${enlace.numero}`;
  if (!enlace.pieza) return base;

  const consulta = new URLSearchParams({
    pestana: "publicar",
    pieza: enlace.pieza,
  });
  if (enlace.red) consulta.set("red", enlace.red);
  return `${base}?${consulta.toString()}`;
}

export function etiquetaEnlace(tarea: TareaVista): string {
  const enlace = tarea.enlace;
  if (enlace === null) return "";

  const vista = tarea.enlace_vista;
  if (enlace.numero === null || enlace.numero === undefined) {
    return vista?.curso_nombre ?? enlace.curso;
  }

  const partes = [`Lección ${enlace.numero}`];
  if (enlace.pieza) partes.push(vista?.pieza_titulo ?? enlace.pieza);
  if (enlace.red) {
    partes.push(REDES.find(([id]) => id === enlace.red)?.[1] ?? enlace.red);
  }
  return partes.join(" · ");
}
