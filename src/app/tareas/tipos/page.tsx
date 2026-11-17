import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { EditorTipos } from "@/components/tareas/EditorTipos";
import { ApiNoDisponible, ErrorApi, obtenerTiposTarea } from "@/lib/api";

async function ContenidoTipos() {
  await connection();

  let tipos;
  try {
    tipos = await obtenerTiposTarea();
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  return <EditorTipos tipos={tipos} />;
}

export default function TiposDeTarea() {
  return (
    <section className="py-8 md:py-12">
      <header className="mb-8">
        <Link href="/tareas" className="text-sm font-medium text-marca hover:text-texto">
          Volver a tareas
        </Link>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">
          Tipos de tarea
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-tenue">
          El color identifica el tipo en las vistas de día y de semana. Un tipo con tareas no se
          puede borrar.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-tenue">Cargando tipos…</p>}>
        <ContenidoTipos />
      </Suspense>
    </section>
  );
}
