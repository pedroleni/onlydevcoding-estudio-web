import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { Teleprompter, type OpcionLeccion } from "@/components/teleprompter/Teleprompter";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerAcciones,
  obtenerCursos,
  obtenerLecciones,
  obtenerTeleprompter,
} from "@/lib/api";
import { CURSO_VALIDO } from "@/lib/curso";
import { lecturaApiOpcional } from "@/lib/lectura-opcional";
import type { EstadoAccion } from "@/lib/tipos";

const NUMERO_VALIDO = /^[1-9]\d{0,2}$/;

const primero = (valor: string | string[] | undefined) =>
  Array.isArray(valor) ? valor[0] : valor;

async function ContenidoTeleprompter({
  searchParams,
}: {
  searchParams: PageProps<"/teleprompter">["searchParams"];
}) {
  const consulta = await searchParams;
  await connection();

  const curso = primero(consulta.curso);
  const leccion = primero(consulta.leccion);
  let seleccion: { curso: string; numero: number } | null = null;

  // Si falta algún parámetro, el componente cliente abre la última lección usada.
  if (curso !== undefined && leccion !== undefined) {
    if (!CURSO_VALIDO.test(curso) || !NUMERO_VALIDO.test(leccion)) {
      notFound();
    }
    seleccion = { curso, numero: Number(leccion) };
  }

  let datos;
  let lecciones: OpcionLeccion[];
  let acciones: EstadoAccion[] | null = null;
  try {
    const [cursos, teleprompter, accionesLeidas] = await Promise.all([
      obtenerCursos(),
      seleccion ? obtenerTeleprompter(seleccion.curso, seleccion.numero) : null,
      // Las acciones solo sirven para seguir una identificación o un color en marcha en la
      // zona de entrega: si la API falla al leerlas, el teleprompter se abre igual.
      seleccion ? lecturaApiOpcional(obtenerAcciones(seleccion.curso, seleccion.numero)) : null,
    ]);
    acciones = accionesLeidas;
    const listas = await Promise.all(cursos.map(({ id }) => obtenerLecciones(id)));
    datos = teleprompter;
    lecciones = cursos.flatMap(({ nombre }, i) =>
      (listas[i] ?? [])
        .filter(({ estado }) => estado.guion)
        .map(({ curso: id, numero, titulo }) => ({
          curso: id,
          numero,
          titulo,
          nombreCurso: nombre,
        })),
    );
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  return (
    <Teleprompter datos={datos} lecciones={lecciones} seleccion={seleccion} acciones={acciones} />
  );
}

export default function PaginaTeleprompter({ searchParams }: PageProps<"/teleprompter">) {
  return (
    <section>
      <Suspense fallback={<p className="py-8 text-sm text-tenue">Cargando teleprompter…</p>}>
        <ContenidoTeleprompter searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
