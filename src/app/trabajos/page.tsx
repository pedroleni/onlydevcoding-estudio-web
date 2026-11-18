import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { TablaTrabajos } from "@/components/acciones/TablaTrabajos";
import { ApiNoDisponible, ErrorApi, obtenerTrabajos } from "@/lib/api";

// Los datos van dentro de <Suspense>: con cacheComponents, la página no puede
// leer datos en tiempo de ejecución fuera de un límite de carga.
export async function ContenidoTrabajos() {
  await connection();

  let trabajos;
  try {
    trabajos = await obtenerTrabajos(20);
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  return <TablaTrabajos trabajos={trabajos} />;
}

function CargandoTrabajos() {
  return (
    <div className="mt-8 border border-borde bg-superficie p-6 text-tenue">
      Cargando trabajos…
    </div>
  );
}

export default function PaginaTrabajos() {
  return (
    <section className="py-10 md:py-16">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-5xl">
          Trabajos
        </h1>
        <p className="mt-3 leading-7 text-tenue">
          Sigue las acciones del estudio y cancela la que esté en marcha.
        </p>
      </header>
      <Suspense fallback={<CargandoTrabajos />}>
        <ContenidoTrabajos />
      </Suspense>
    </section>
  );
}
