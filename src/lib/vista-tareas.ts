import { CURSO_VALIDO, REDES } from "@/lib/curso";
import { esFechaValida } from "@/lib/fechas";
import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";

export const SIN_CURSO = "sin-curso";

const TIPO_VALIDO = /^[a-z0-9-]{1,30}$/;
const FECHA = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

export type VistaTareas = "dia" | "semana";

export interface ParametrosTareas {
  vista: VistaTareas;
  dia: string;
  curso: string | null;
  tipo: string | null;
}

export interface GrupoTipo {
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

export function leerParametrosTareas(consulta: Consulta, hoy: string): ParametrosTareas {
  const vista = primero(consulta.vista);
  const dia = primero(consulta.dia);
  const curso = primero(consulta.curso);
  const tipo = primero(consulta.tipo);

  return {
    vista: vista === "semana" ? "semana" : "dia",
    dia: dia !== undefined && FECHA.test(dia) && esFechaValida(dia) ? dia : hoy,
    curso:
      curso !== undefined && (curso === SIN_CURSO || CURSO_VALIDO.test(curso)) ? curso : null,
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

function compararTareas(a: TareaVista, b: TareaVista): number {
  if (a.hora !== b.hora) {
    if (a.hora === null) return 1;
    if (b.hora === null) return -1;
    return a.hora < b.hora ? -1 : 1;
  }
  return a.id - b.id;
}

function tipoDesconocido(id: string): TipoTarea {
  return { id, nombre: id, color: "#9B9BA4", orden: Number.MAX_SAFE_INTEGER };
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
      (id): id is string => id !== null && !cursos.some((curso) => curso.id === id),
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
        tipo: tiposPorId.get(id) ?? tipoDesconocido(id),
        tareas: [...lista].sort(compararTareas),
      }))
      .sort((a, b) => a.tipo.orden - b.tipo.orden || a.tipo.id.localeCompare(b.tipo.id));

    const nombre =
      curso === null
        ? "Sin curso"
        : cursos.find(({ id }) => id === curso)?.nombre ??
          delCurso.find((tarea) => tarea.enlace_vista?.curso_nombre)?.enlace_vista?.curso_nombre ??
          curso;

    return { curso, nombre, tipos: grupos };
  });
}

export function hrefEnlace(tarea: TareaVista): string | null {
  const enlace = tarea.enlace;
  if (enlace === null || tarea.enlace_vista?.roto) return null;

  const curso = encodeURIComponent(enlace.curso);
  if (enlace.numero === null || enlace.numero === undefined) {
    return `/cursos/${curso}`;
  }

  const base = `/cursos/${curso}/${enlace.numero}`;
  if (!enlace.pieza) return base;

  const consulta = new URLSearchParams({ pestana: "publicar", pieza: enlace.pieza });
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
