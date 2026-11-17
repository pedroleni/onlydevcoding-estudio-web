import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { CabeceraTareas } from "@/components/tareas/CabeceraTareas";
import { VistaDia } from "@/components/tareas/VistaDia";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerTareas,
  obtenerTiposTarea,
} from "@/lib/api";
import { fechaLocal } from "@/lib/fechas";
import { filtrarTareas, leerParametrosTareas } from "@/lib/vista-tareas";

async function ContenidoTareas({
  searchParams,
}: {
  searchParams: PageProps<"/tareas">["searchParams"];
}) {
  const consulta = await searchParams;
  await connection();

  const hoy = fechaLocal(new Date());
  const parametros = leerParametrosTareas(consulta, hoy);
  const esHoy = parametros.dia === hoy;

  let datos;
  let cursos;
  let tipos;
  try {
    [datos, cursos, tipos] = await Promise.all([
      obtenerTareas(parametros.dia, parametros.dia, esHoy),
      obtenerCursos(),
      obtenerTiposTarea(),
    ]);
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }
    throw error;
  }

  return (
    <>
      <CabeceraTareas parametros={parametros} hoy={hoy} cursos={cursos} tipos={tipos} />
      <div className="mt-8">
        <VistaDia
          tareas={filtrarTareas(datos.tareas, parametros.curso, parametros.tipo)}
          atrasadas={filtrarTareas(datos.atrasadas, parametros.curso, parametros.tipo)}
          cursos={cursos}
          tipos={tipos}
          esHoy={esHoy}
        />
      </div>
    </>
  );
}

export default function Tareas({ searchParams }: PageProps<"/tareas">) {
  return (
    <section className="py-8 md:py-12">
      <Suspense fallback={<p className="text-sm text-tenue">Cargando tareas…</p>}>
        <ContenidoTareas searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
