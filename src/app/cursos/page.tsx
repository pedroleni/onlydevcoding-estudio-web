import Link from "next/link";
import type { CSSProperties } from "react";
import { connection } from "next/server";

import { AvisoApi } from "@/components/AvisoApi";
import { FormularioCurso } from "@/components/FormularioCurso";
import { LogoTecnologia } from "@/components/LogoTecnologia";
import { ApiNoDisponible, ErrorApi, obtenerCursos } from "@/lib/api";
import { tecnologiaDe } from "@/lib/tecnologias";

export default async function PaginaCursos() {
  await connection();
  let cursos: Awaited<ReturnType<typeof obtenerCursos>>;

  try {
    cursos = await obtenerCursos();
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }

    throw error;
  }

  return (
    <section className="py-10 md:py-16">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-5xl">
            Cursos
          </h1>
          <p className="mt-3 leading-7 text-tenue">
            Elige un curso para revisar sus lecciones y el estado de producción.
          </p>
        </div>
        <FormularioCurso />
      </header>

      {cursos.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cursos.map((curso) => (
            <Link
              key={curso.id}
              href={`/cursos/${encodeURIComponent(curso.id)}`}
              className="tarjeta-leccion group flex items-center gap-5 rounded-3xl border border-borde bg-superficie p-6 transition duration-200 hover:-translate-y-0.5 active:translate-y-px"
              style={
                {
                  "--mod": tecnologiaDe(curso.id, curso.nombre)?.color,
                  background: `radial-gradient(120% 160% at 0% 0%, color-mix(in srgb, ${tecnologiaDe(curso.id, curso.nombre)?.color ?? "var(--marca)"} 14%, transparent), transparent 60%), var(--superficie)`,
                } as CSSProperties
              }
            >
              <LogoTecnologia id={curso.id} nombre={curso.nombre} />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-[-0.025em]">{curso.nombre}</h2>
                <p className="mt-1.5 font-mono text-sm text-tenue">
                  {curso.en_disco
                    ? `${curso.lecciones} ${curso.lecciones === 1 ? "lección" : "lecciones"}`
                    : "Sin carpeta todavía"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
          Todavía no hay cursos disponibles.
        </p>
      )}
    </section>
  );
}
