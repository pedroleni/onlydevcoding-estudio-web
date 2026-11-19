import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLecciones,
  obtenerPublicacion,
} from "@/lib/api";
import {
  avanceCurso,
  contarLeccion,
  type LeccionContada,
  plural,
  rangoNumeros,
  totalesPublicacion,
} from "@/lib/estadisticas-publicacion";
import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";
import { lecturaApiOpcional } from "@/lib/lectura-opcional";
import { faltaVideoPropio, nombreRed } from "@/lib/redes-publicacion";
import type { Curso, EstadoRed, LeccionResumen, PiezaVista, RedVista } from "@/lib/tipos";
import { errorUrlPublicacion } from "@/lib/url-publicacion";

const ICONO: Record<EstadoRed["estado"], string> = {
  publicado: "✅",
  programado: "📅",
  pendiente: "⬜",
};

const ESTADO_LEGIBLE: Record<EstadoRed["estado"], string> = {
  publicado: "subido",
  programado: "programado",
  pendiente: "pendiente",
};

const CHIP: Record<EstadoRed["estado"], string> = {
  publicado: "border-borde text-tenue",
  programado: "border-marca text-azul-claro",
  pendiente: "border-ambar text-ambar",
};

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}

function hrefPublicar(curso: string, numero: number, pieza: string, red: string): string {
  return `/cursos/${encodeURIComponent(curso)}/${numero}?pestana=publicar&pieza=${encodeURIComponent(pieza)}&red=${encodeURIComponent(red)}`;
}

function urlSegura(url: string | null): string | null {
  return url && errorUrlPublicacion(url) === null ? url : null;
}

interface DatosCurso {
  curso: Curso;
  lecciones: LeccionResumen[];
  contadas: LeccionContada[];
  sinLeer: number[];
}

async function leerCurso(curso: Curso): Promise<DatosCurso> {
  const lecciones = (await obtenerLecciones(curso.id)) ?? [];
  const vistas = await Promise.all(
    lecciones.map(({ numero }) => lecturaApiOpcional(obtenerPublicacion(curso.id, numero))),
  );
  return {
    curso,
    lecciones,
    contadas: lecciones.map(({ numero, titulo }, i) => contarLeccion(numero, titulo, vistas[i])),
    sinLeer: lecciones.filter((_, i) => vistas[i] === null).map(({ numero }) => numero),
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
  const { curso, lecciones, contadas } = datos;
  const avance = avanceCurso(
    lecciones.map(({ numero, estado }, i) => ({
      numero,
      estado,
      publicacion: { subidas: contadas[i].subidas, total: contadas[i].total },
    })),
  );

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
          {avance.porLeccion.map(({ numero, porcentaje }) => (
            <li key={numero}>
              <Link
                href={`/cursos/${encodeURIComponent(curso.id)}/${numero}`}
                className="block border border-borde px-1 py-1.5 text-center text-[11px] text-tenue hover:border-marca"
              >
                <span className="block font-mono text-xs text-marca">{dosCifras(numero)}</span>
                {porcentaje} %
                <span className="relative mt-1 block h-1 bg-carbon" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 bg-verde"
                    style={{ width: `${porcentaje}%` }}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-tenue">
          Cada lección cuenta igual y tiene 4 pasos con el mismo peso: voz, cámara, vídeo final y
          publicación. Una lección sin textos de publicación cuenta ese paso como 0.
        </p>
      </div>
    </section>
  );
}

function Cifras({ contadas }: { contadas: LeccionContada[] }) {
  const totales = totalesPublicacion(contadas);
  const cifras = [
    { valor: totales.quedan, texto: "quedan", color: "text-ambar" },
    { valor: totales.subidas, texto: "subidas", color: "text-verde" },
    ...totales.quedanPorRed.map(({ nombre, quedan }) => ({
      valor: quedan,
      texto: nombre,
      color: "text-texto",
    })),
  ];

  return (
    <ul aria-label="Cifras de publicación" className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
      {cifras.map(({ valor, texto, color }) => (
        <li key={texto} className="border border-borde bg-superficie p-3 text-sm text-tenue">
          <span className={`block text-2xl font-semibold ${color}`}>{valor}</span>
          <span>{texto}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipRed({
  curso,
  numero,
  pieza,
  red,
}: {
  curso: string;
  numero: number;
  pieza: PiezaVista;
  red: RedVista;
}) {
  const estado = red.estado.estado;
  const sinVideo = estado !== "publicado" && faltaVideoPropio(pieza, red);
  return (
    <Link
      href={hrefPublicar(curso, numero, pieza.id, red.red)}
      aria-label={`${ICONO[estado]} ${nombreRed(red.red)}, ${ESTADO_LEGIBLE[estado]}${sinVideo ? ", sin vídeo" : ""}`}
      className={`border bg-carbon px-2 py-0.5 text-xs hover:border-marca hover:text-texto ${CHIP[estado]}`}
    >
      <span aria-hidden="true">{ICONO[estado]}</span> {nombreRed(red.red)}
      {sinVideo ? " · sin vídeo" : null}
    </Link>
  );
}

function CabeceraLeccion({
  leccion,
  cuenta,
  color,
}: {
  leccion: LeccionContada;
  cuenta: string;
  color: string;
}) {
  return (
    <>
      <span className="font-mono text-sm text-marca">{dosCifras(leccion.numero)}</span>
      <span className="min-w-0 flex-1 font-semibold">{leccion.titulo}</span>
      <span className={`shrink-0 text-xs ${color}`}>{cuenta}</span>
    </>
  );
}

function QuedaPorSubir({ datos }: { datos: DatosCurso }) {
  const { curso, contadas, sinLeer } = datos;
  const conPendientes = contadas.filter((l) => l.pendientes > 0);
  const sinTextos = contadas
    .filter((l) => l.total === 0 && !sinLeer.includes(l.numero))
    .map((l) => l.numero);

  return (
    <section aria-labelledby={`queda-${curso.id}`} className="mt-8">
      <h2 id={`queda-${curso.id}`} className="text-lg font-semibold tracking-[-0.02em]">
        Queda por subir
      </h2>
      {conPendientes.length === 0 ? (
        <p className="mt-3 text-sm text-tenue">No queda nada por subir de lo preparado.</p>
      ) : null}
      <div className="mt-3 grid gap-2.5">
        {conPendientes.map((leccion) => (
          <article
            key={leccion.numero}
            aria-label={`Lección ${leccion.numero}`}
            className="border border-borde bg-superficie"
          >
            <h3 className="flex items-baseline gap-2 px-3 py-2.5 text-sm">
              <CabeceraLeccion
                leccion={leccion}
                cuenta={`${leccion.pendientes} por subir`}
                color="text-ambar"
              />
            </h3>
            <ul>
              {leccion.piezas
                .filter((p) => p.pendientes.length > 0)
                .map(({ pieza, redes }) => (
                  <li
                    key={pieza.id}
                    aria-label={pieza.titulo}
                    className="grid gap-1.5 border-t border-borde px-3 py-2"
                  >
                    <span className="text-sm">{pieza.titulo}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {redes.map((red) => (
                        <ChipRed
                          key={red.red}
                          curso={curso.id}
                          numero={leccion.numero}
                          pieza={pieza}
                          red={red}
                        />
                      ))}
                    </span>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
      {sinTextos.length > 0 ? (
        <p className="mt-3 text-sm text-tenue">
          {sinTextos.length === 1 ? "Lección" : "Lecciones"} {rangoNumeros(sinTextos)}: aún sin
          textos de publicación.
        </p>
      ) : null}
      {sinLeer.length > 0 ? (
        <p className="mt-2 text-sm text-ambar">
          No se pudo leer la publicación de {sinLeer.length === 1 ? "la lección" : "las lecciones"}{" "}
          {rangoNumeros(sinLeer)}.
        </p>
      ) : null}
    </section>
  );
}

function YaSubido({ datos }: { datos: DatosCurso }) {
  const { curso, contadas } = datos;
  const conSubidas = contadas.filter((l) => l.subidas > 0);
  if (conSubidas.length === 0) return null;

  return (
    <section aria-labelledby={`subido-${curso.id}`} className="mt-8">
      <h2 id={`subido-${curso.id}`} className="text-lg font-semibold tracking-[-0.02em]">
        Ya subido
      </h2>
      <div className="mt-3 grid gap-2.5">
        {conSubidas.map((leccion) => (
          <details key={leccion.numero} className="group border border-borde bg-superficie">
            <summary className="flex cursor-pointer list-none items-baseline gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
              <CabeceraLeccion
                leccion={leccion}
                cuenta={plural(leccion.subidas, "subida", "subidas")}
                color="text-verde"
              />
            </summary>
            <ul>
              {leccion.piezas
                .filter((p) => p.subidas.length > 0)
                .map(({ pieza, subidas }) => (
                  <li key={pieza.id} className="border-t border-borde px-3 py-2">
                    <span className="text-sm">{pieza.titulo}</span>
                    <ul className="mt-1 grid gap-0.5 text-[13px] text-tenue">
                      {subidas.map(({ red, estado }) => {
                        const url = urlSegura(estado.url);
                        return (
                          <li key={red}>
                            ✅ {nombreRed(red)}
                            {estado.fecha
                              ? ` · ${fechaPublicacionLegible(estado.fecha, { timeZone: "Europe/Madrid" })}`
                              : null}{" "}
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-marca hover:text-texto"
                              >
                                abrir ↗
                              </a>
                            ) : (
                              <span className="ml-1">sin enlace</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
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
            <Cifras contadas={datos.contadas} />
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
