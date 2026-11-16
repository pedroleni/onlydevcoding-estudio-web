import Link from "next/link";
import { connection } from "next/server";

import { AvisoApi } from "@/components/AvisoApi";
import { ApiNoDisponible, ErrorApi, obtenerCursos } from "@/lib/api";

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
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-5xl">
          Cursos
        </h1>
        <p className="mt-3 leading-7 text-tenue">
          Elige un curso para revisar sus lecciones y el estado de producción.
        </p>
      </header>

      {cursos.length > 0 ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {cursos.map((curso) => (
            <Link
              key={curso.id}
              href={`/cursos/${encodeURIComponent(curso.id)}`}
              className="group border border-borde bg-superficie p-6 transition-colors hover:border-marca active:translate-y-px"
            >
              <h2 className="text-xl font-semibold tracking-[-0.025em] group-hover:text-marca">
                {curso.nombre}
              </h2>
              <p className="mt-8 font-mono text-sm text-tenue">
                {curso.lecciones}{" "}
                {curso.lecciones === 1 ? "lección" : "lecciones"}
              </p>
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
