import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AvisoApi } from "@/components/AvisoApi";
import { ApiNoDisponible, obtenerLecciones } from "@/lib/api";
import type { EstadoLeccion } from "@/lib/tipos";

const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;
const REDES = [
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
] as const;

function publicada(estado: EstadoLeccion, clave: string, nombre: string) {
  return estado.publicado[clave] ?? estado.publicado[nombre] ?? false;
}

export default async function PaginaCurso({
  params,
}: PageProps<"/cursos/[curso]">) {
  await connection();
  const { curso } = await params;

  if (!CURSO_VALIDO.test(curso)) {
    notFound();
  }

  let lecciones;

  try {
    lecciones = await obtenerLecciones(curso);
  } catch (error) {
    if (error instanceof ApiNoDisponible) {
      return <AvisoApi />;
    }

    throw error;
  }

  if (lecciones === null) {
    notFound();
  }

  const nombreCurso = lecciones[0]?.curso ?? curso.replaceAll("-", " ");

  return (
    <section className="py-10 md:py-16">
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
          {lecciones.length}{" "}
          {lecciones.length === 1 ? "lección" : "lecciones"}
        </p>
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
                  Cámara {leccion.estado.camara.hechas}/
                  {leccion.estado.camara.total}
                </span>
                <span className="border border-borde bg-carbon px-2 py-1">
                  {leccion.estado.video_final ? "✅" : "⬜"} Vídeo final
                </span>
                {REDES.map(([clave, nombre]) => (
                  <span
                    key={clave}
                    className="border border-borde bg-carbon px-2 py-1"
                  >
                    {publicada(leccion.estado, clave, nombre) ? "✅" : "⬜"}{" "}
                    {nombre}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
          Este curso todavía no tiene lecciones.
        </p>
      )}
    </section>
  );
}
