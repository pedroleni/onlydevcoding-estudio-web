import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { BotonBorrarCurso } from "@/components/FormularioCurso";
import { ListaLecciones } from "@/components/ListaLecciones";
import { LogoTecnologia } from "@/components/LogoTecnologia";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLecciones,
  obtenerTemario,
} from "@/lib/api";
import { CURSO_VALIDO } from "@/lib/curso";
import { estadoFicha, fichasCurso } from "@/lib/lecciones-curso";
import { lecturaApiOpcional } from "@/lib/lectura-opcional";
import { tecnologiaDe } from "@/lib/tecnologias";

function CargandoCurso() {
  return (
    <div className="border border-borde bg-superficie p-6 text-tenue">
      Cargando curso…
    </div>
  );
}

function resumenCurso(
  datos: {
    conTemario: boolean;
    preparadas: number;
    totalFichas: number;
    terminadas: number;
    totalLecciones: number;
  },
): string {
  if (datos.conTemario) {
    const final = datos.terminadas === 1 ? "terminada" : "terminadas";
    return `${datos.preparadas} de ${datos.totalFichas} lecciones preparadas · ${datos.terminadas} ${final}`;
  }
  const nombre = datos.totalLecciones === 1 ? "lección" : "lecciones";
  return `${datos.totalLecciones} ${nombre}`;
}

function CabeceraCurso({
  color,
  curso,
  mostrarBorrar,
  nombre,
  resumen,
}: {
  color: string;
  curso: string;
  mostrarBorrar: boolean;
  nombre: string;
  resumen: string;
}) {
  return (
    <header>
      <Link
        href="/cursos"
        className="text-sm font-medium text-marca hover:text-texto"
      >
        Volver a cursos
      </Link>
      <div
        className="mt-5 flex items-center gap-4 rounded-3xl border border-borde p-4 md:gap-6 md:p-6"
        style={{
          background: `radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, ${color} 16%, transparent), transparent 60%)`,
        }}
      >
        <LogoTecnologia id={curso} nombre={nombre} tamano="lg" />
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold capitalize tracking-[-0.035em] md:text-5xl">
            {nombre}
          </h1>
          <p className="mt-2 text-tenue">{resumen}</p>
        </div>
      </div>
      {mostrarBorrar ? (
        <div className="mt-5">
          <BotonBorrarCurso curso={curso} nombre={nombre} />
        </div>
      ) : null}
    </header>
  );
}

function ContenidoLecciones({
  curso,
  fichas,
}: {
  curso: string;
  fichas: ReturnType<typeof fichasCurso>;
}) {
  if (fichas.length > 0) return <ListaLecciones curso={curso} fichas={fichas} />;
  return (
    <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
      Este curso aún no tiene lecciones en disco
    </p>
  );
}

function esErrorEsperado(error: unknown): error is ApiNoDisponible | ErrorApi {
  return error instanceof ApiNoDisponible || error instanceof ErrorApi;
}

async function ContenidoCurso({
  params,
}: Pick<PageProps<"/cursos/[curso]">, "params">) {
  const { curso } = await params;
  await connection();

  if (!CURSO_VALIDO.test(curso)) {
    notFound();
  }

  let lecciones;
  let cursos;
  let temario;

  try {
    [lecciones, cursos, temario] = await Promise.all([
      obtenerLecciones(curso),
      obtenerCursos(),
      lecturaApiOpcional(obtenerTemario(curso)),
    ]);
  } catch (error) {
    if (esErrorEsperado(error)) {
      return <AvisoApi error={error} />;
    }

    throw error;
  }

  if (lecciones === null) {
    notFound();
  }

  const datosCurso = cursos.find(({ id }) => id === curso);
  const nombreCurso = datosCurso?.nombre ?? lecciones[0]?.curso ?? curso.replaceAll("-", " ");

  const fichas = fichasCurso(lecciones, temario?.lecciones ?? []);
  const preparadas = fichas.filter((f) => f.leccion !== null).length;
  const terminadas = fichas.filter((f) => estadoFicha(f) === "terminada").length;
  const color = tecnologiaDe(curso, nombreCurso)?.color ?? "var(--marca)";
  const resumen = resumenCurso({
    conTemario: Boolean(temario && temario.lecciones.length > 0),
    preparadas,
    totalFichas: fichas.length,
    terminadas,
    totalLecciones: lecciones.length,
  });

  return (
    <>
      <CabeceraCurso
        color={color}
        curso={curso}
        mostrarBorrar={Boolean(datosCurso && !datosCurso.en_disco)}
        nombre={nombreCurso}
        resumen={resumen}
      />
      <ContenidoLecciones curso={curso} fichas={fichas} />
    </>
  );
}

export default function PaginaCurso({
  params,
}: PageProps<"/cursos/[curso]">) {
  return (
    <section className="py-10 md:py-16">
      <Suspense fallback={<CargandoCurso />}>
        <ContenidoCurso params={params} />
      </Suspense>
    </section>
  );
}
