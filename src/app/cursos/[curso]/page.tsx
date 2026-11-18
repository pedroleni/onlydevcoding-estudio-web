import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { BotonBorrarCurso } from "@/components/FormularioCurso";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLecciones,
} from "@/lib/api";
import { CURSO_VALIDO, marcaPublicacion, REDES } from "@/lib/curso";

function CargandoCurso() {
  return (
    <div className="border border-borde bg-superficie p-6 text-tenue">
      Cargando curso…
    </div>
  );
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

  try {
    [lecciones, cursos] = await Promise.all([obtenerLecciones(curso), obtenerCursos()]);
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }

    throw error;
  }

  if (lecciones === null) {
    notFound();
  }

  const datosCurso = cursos.find(({ id }) => id === curso);
  const nombreCurso = datosCurso?.nombre ?? lecciones[0]?.curso ?? curso.replaceAll("-", " ");

  return (
    <>
      <header>
        <Link
          href="/cursos"
          className="text-sm font-medium text-marca hover:text-texto"
        >
          Volver a cursos
        </Link>
        <h1 className="mt-5 text-3xl font-semibold capitalize tracking-[-0.035em] md:text-5xl">
          {nombreCurso}
        </h1>
        <p className="mt-3 text-tenue">
          {lecciones.length} {lecciones.length === 1 ? "lección" : "lecciones"}
        </p>
        {datosCurso && !datosCurso.en_disco ? (
          <div className="mt-5">
            <BotonBorrarCurso curso={curso} nombre={nombreCurso} />
          </div>
        ) : null}
      </header>

      {lecciones.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {lecciones.map((leccion) => (
            <Link
              key={leccion.numero}
              href={`/cursos/${encodeURIComponent(curso)}/${leccion.numero}`}
              className="group border border-borde bg-superficie p-5 transition-colors hover:border-marca active:translate-y-px"
            >
              <div className="flex items-start gap-4">
                <span className="font-mono text-sm text-marca">
                  {String(leccion.numero).padStart(2, "0")}
                </span>
                <h2 className="text-lg font-semibold tracking-[-0.02em] group-hover:text-marca">
                  {leccion.titulo}
                </h2>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 text-xs text-tenue">
                <span className="border border-borde bg-carbon px-2 py-1">
                  Voz {leccion.estado.voz.hechas}/{leccion.estado.voz.total}
                </span>
                <span className="border border-borde bg-carbon px-2 py-1">
                  Cámara {leccion.estado.camara.hechas}/{leccion.estado.camara.total}
                </span>
                <span className="border border-borde bg-carbon px-2 py-1">
                  {leccion.estado.video_final ? "✅" : "⬜"} Vídeo final
                </span>
                {REDES.map(([clave, nombre]) => {
                  const marca = marcaPublicacion(leccion.estado, clave, nombre);
                  return (
                    <span
                      key={clave}
                      className="border border-borde bg-carbon px-2 py-1"
                    >
                      {marca.icono} {marca.texto}
                    </span>
                  );
                })}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
          Este curso aún no tiene lecciones en disco
        </p>
      )}
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
