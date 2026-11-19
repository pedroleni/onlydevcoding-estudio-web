import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { ModoTeleprompter } from "@/components/teleprompter/ModoTeleprompter";
import { TODAS, TeleprompterReels } from "@/components/teleprompter/TeleprompterReels";
import { ApiNoDisponible, ErrorApi, obtenerCursos, obtenerReels } from "@/lib/api";
import { CURSO_VALIDO } from "@/lib/curso";

const primero = (valor: string | string[] | undefined) =>
  Array.isArray(valor) ? valor[0] : valor;

export async function ContenidoReels({
  searchParams,
}: {
  searchParams: PageProps<"/teleprompter/reels">["searchParams"];
}) {
  const consulta = await searchParams;
  await connection();

  let curso: string | undefined;
  let reels;
  try {
    const cursos = (await obtenerCursos()).filter((c) => c.en_disco);
    const pedido = primero(consulta.curso);
    curso =
      pedido && CURSO_VALIDO.test(pedido) && cursos.some((c) => c.id === pedido)
        ? pedido
        : cursos[0]?.id;
    reels = curso ? await obtenerReels(curso) : null;
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  if (!curso || !reels) {
    return <p className="py-8 text-tenue">No hay cursos con guiones en disco.</p>;
  }

  return (
    <TeleprompterReels
      key={curso}
      curso={curso}
      reels={reels}
      leccionInicial={primero(consulta.leccion) ?? TODAS}
    />
  );
}

export default function PaginaReels({ searchParams }: PageProps<"/teleprompter/reels">) {
  return (
    <section>
      <ModoTeleprompter activo="reels" />
      <Suspense fallback={<p className="py-8 text-sm text-tenue">Cargando reels…</p>}>
        <ContenidoReels searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
