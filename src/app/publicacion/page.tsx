import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import type { DatosCurso } from "@/app/publicacion/datos-publicacion";
import { QuedaPorSubir, YaSubido } from "@/app/publicacion/FilasPublicacion";
import { AvisoApi } from "@/components/AvisoApi";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLecciones,
  obtenerPublicacion,
  obtenerReels,
  obtenerTemario,
} from "@/lib/api";
import {
  avanceCurso,
  contarLeccion,
  plural,
  totalesPublicacion,
} from "@/lib/estadisticas-publicacion";
import { type FichaLeccion, fichasCurso } from "@/lib/lecciones-curso";
import { lecturaApiOpcional } from "@/lib/lectura-opcional";
import { GANCHOS_POR_LECCION, PUBLICACIONES_POR_LECCION } from "@/lib/plan-publicacion";
import type {
  Curso,
  EstadoLeccion,
  ReelsCurso,
} from "@/lib/tipos";

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}

// Estado de una lección que aún no existe en disco: no cuenta nada hecho.
const ESTADO_SIN_EMPEZAR: EstadoLeccion = {
  guion: false,
  voz: { hechas: 0, total: 0 },
  camara: { hechas: 0, total: 0 },
  video_final: false,
  miniatura: null,
  previa: null,
  publicado: {},
};

// Ganchos verticales: los del guion de cada lección; sin guion, los 4 previstos.
function contarGanchos(fichas: FichaLeccion[], reels: ReelsCurso | null) {
  let grabados = 0;
  let total = 0;
  for (const ficha of fichas) {
    const deReels = reels?.lecciones.find(({ numero }) => numero === ficha.numero);
    if (deReels) {
      total += deReels.ganchos.length;
      grabados += deReels.ganchos.filter(({ grabado }) => grabado).length;
    } else if (!ficha.leccion?.estado.guion) {
      total += GANCHOS_POR_LECCION;
    }
  }
  return { grabados, total };
}

async function leerCurso(curso: Curso): Promise<DatosCurso> {
  const [lecciones, temario, reels] = await Promise.all([
    obtenerLecciones(curso.id).then((l) => l ?? []),
    lecturaApiOpcional(obtenerTemario(curso.id)),
    lecturaApiOpcional(obtenerReels(curso.id)),
  ]);
  const fichas = fichasCurso(lecciones, temario?.lecciones ?? []);
  const vistas = await Promise.all(
    fichas.map(({ numero, leccion }) =>
      leccion ? lecturaApiOpcional(obtenerPublicacion(curso.id, numero)) : null,
    ),
  );
  return {
    curso,
    fichas,
    contadas: fichas.map(({ numero, titulo }, i) => contarLeccion(numero, titulo, vistas[i])),
    sinLeer: fichas
      .filter(({ leccion }, i) => leccion !== null && vistas[i] === null)
      .map(({ numero }) => numero),
    ganchos: contarGanchos(fichas, reels),
  };
}

function BarraAvance({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className="relative h-2.5 bg-carbon"
    >
      <span className="absolute inset-y-0 left-0 bg-verde" style={{ width: `${porcentaje}%` }} />
    </div>
  );
}

function VisionGlobal({ datos }: { datos: DatosCurso }) {
  const { curso, fichas, contadas } = datos;
  const avance = avanceCurso(
    fichas.map(({ numero, leccion }, i) => ({
      numero,
      estado: leccion?.estado ?? ESTADO_SIN_EMPEZAR,
      publicacion: { subidas: contadas[i].subidas, total: contadas[i].total },
    })),
  );
  const enDisco = new Set(fichas.filter((f) => f.leccion).map((f) => f.numero));

  return (
    <section aria-label={`Visión global de ${curso.nombre}`} className="mt-8">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">Visión global del curso</h2>
      <div className="mt-3 border border-borde bg-superficie p-4 md:p-5">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="whitespace-nowrap text-4xl font-semibold tracking-[-0.03em]">
            {avance.porcentaje} %
          </span>
          <span className="text-tenue">
            hecho ·{" "}
            <strong className="font-semibold text-ambar">queda el {avance.queda} %</strong> para
            acabar {curso.nombre}
          </span>
        </p>
        <div className="mt-3">
          <BarraAvance porcentaje={avance.porcentaje} etiqueta="Avance del curso" />
        </div>
        <p className="mt-1.5 text-xs text-tenue">
          {avance.terminadas} de {plural(avance.lecciones, "lección", "lecciones")}{" "}
          {avance.terminadas === 1 ? "terminada" : "terminadas"} del todo
        </p>

        <dl className="mt-4 grid gap-1.5 text-sm">
          {avance.pasos.map(({ paso, porcentaje }) => (
            <div key={paso} className="grid grid-cols-[6.5rem_1fr_3rem] items-center gap-3">
              <dt>{paso}</dt>
              <span className="relative h-1.5 bg-carbon" aria-hidden="true">
                <span
                  className="absolute inset-y-0 left-0 bg-marca"
                  style={{ width: `${porcentaje}%` }}
                />
              </span>
              <dd className="text-right font-mono text-xs text-tenue">{porcentaje} %</dd>
            </div>
          ))}
        </dl>

        <ul
          aria-label="Avance por lección"
          className="mt-4 grid grid-cols-6 gap-1.5 md:grid-cols-12"
        >
          {avance.porLeccion.map(({ numero, porcentaje }) => {
            const contenido = (
              <>
                <span className="block font-mono text-xs text-marca">{dosCifras(numero)}</span>
                {porcentaje} %
                <span className="relative mt-1 block h-1 bg-carbon" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 bg-verde"
                    style={{ width: `${porcentaje}%` }}
                  />
                </span>
              </>
            );
            return (
              <li key={numero}>
                {enDisco.has(numero) ? (
                  <Link
                    href={`/cursos/${encodeURIComponent(curso.id)}/${numero}`}
                    className="block border border-borde px-1 py-1.5 text-center text-[11px] text-tenue hover:border-marca"
                  >
                    {contenido}
                  </Link>
                ) : (
                  <span className="block border border-dashed border-borde px-1 py-1.5 text-center text-[11px] text-tenue opacity-60">
                    {contenido}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs leading-5 text-tenue">
          Sobre las {plural(fichas.length, "lección", "lecciones")} del curso, también las que aún
          no están preparadas. Cada una cuenta igual y tiene 4 pasos con el mismo peso: voz,
          cámara, vídeo final y publicación (sus {PUBLICACIONES_POR_LECCION} publicaciones).
        </p>
      </div>
    </section>
  );
}

function Cifras({ datos }: { datos: DatosCurso }) {
  const { contadas, ganchos } = datos;
  const totales = totalesPublicacion(contadas);
  const cifras = [
    { valor: totales.quedan, texto: "quedan", color: "text-ambar" },
    { valor: totales.subidas, texto: "subidas", color: "text-verde" },
    {
      valor: `${ganchos.grabados}/${ganchos.total}`,
      texto: "ganchos grabados",
      color: "text-azul-claro",
    },
    ...totales.quedanPorRed.map(({ nombre, quedan }) => ({
      valor: quedan,
      texto: nombre,
      color: "text-texto",
    })),
  ];

  return (
    <ul aria-label="Cifras de publicación" className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-7">
      {cifras.map(({ valor, texto, color }) => (
        <li key={texto} className="border border-borde bg-superficie p-3 text-sm text-tenue">
          <span className={`block text-2xl font-semibold ${color}`}>{valor}</span>
          <span>{texto}</span>
        </li>
      ))}
    </ul>
  );
}

// Los datos van dentro de <Suspense>: con cacheComponents, la página no puede
// leer datos en tiempo de ejecución fuera de un límite de carga.
export async function ContenidoPublicacion() {
  await connection();

  let cursos: DatosCurso[];
  try {
    const todos = await obtenerCursos();
    cursos = await Promise.all(todos.filter((c) => c.en_disco).map(leerCurso));
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  if (cursos.length === 0) {
    return (
      <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
        No hay cursos en disco.
      </p>
    );
  }

  return (
    <>
      {cursos.map((datos) => (
        <div key={datos.curso.id} className="mt-6">
          {cursos.length > 1 ? (
            <p className="text-sm font-medium text-marca">{datos.curso.nombre}</p>
          ) : null}
          <VisionGlobal datos={datos} />
          <section aria-labelledby={`cifras-${datos.curso.id}`} className="mt-8">
            <h2
              id={`cifras-${datos.curso.id}`}
              className="text-lg font-semibold tracking-[-0.02em]"
            >
              Publicación
            </h2>
            <Cifras datos={datos} />
          </section>
          <QuedaPorSubir datos={datos} />
          <YaSubido datos={datos} />
        </div>
      ))}
    </>
  );
}

function CargandoPublicacion() {
  return (
    <div className="mt-8 border border-borde bg-superficie p-6 text-tenue">
      Cargando publicación…
    </div>
  );
}

export default function PaginaPublicacion() {
  return (
    <section className="py-10 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-5xl">Publicación</h1>
        <p className="mt-3 leading-7 text-tenue">
          Cuánto queda para acabar el curso, qué falta por subir y qué ya está subido.
        </p>
      </header>
      <Suspense fallback={<CargandoPublicacion />}>
        <ContenidoPublicacion />
      </Suspense>
    </section>
  );
}
