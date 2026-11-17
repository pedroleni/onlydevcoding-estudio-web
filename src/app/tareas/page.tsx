import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { CabeceraTareas } from "@/components/tareas/CabeceraTareas";
import { BotonEditarTarea, BotonNuevaTarea } from "@/components/tareas/FormularioTarea";
import { VistaDia } from "@/components/tareas/VistaDia";
import { VistaSemana } from "@/components/tareas/VistaSemana";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerTareas,
  obtenerTiposTarea,
} from "@/lib/api";
import { diasDeSemana, fechaLocal } from "@/lib/fechas";
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
  const semana = parametros.vista === "semana";
  const dias = diasDeSemana(parametros.dia);

  let datos;
  let cursos;
  let tipos;
  try {
    [datos, cursos, tipos] = await Promise.all([
      semana
        ? obtenerTareas(dias[0], dias[6], false)
        : obtenerTareas(parametros.dia, parametros.dia, esHoy),
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
      <CabeceraTareas
        parametros={parametros}
        hoy={hoy}
        cursos={cursos}
        tipos={tipos}
        accion={<BotonNuevaTarea cursos={cursos} tipos={tipos} fecha={parametros.dia} />}
      />
      <div className="mt-8">
        {semana ? (
          <VistaSemana tareas={datos.tareas} tipos={tipos} parametros={parametros} />
        ) : (
          <VistaDia
            tareas={filtrarTareas(datos.tareas, parametros.curso, parametros.tipo)}
            atrasadas={filtrarTareas(datos.atrasadas, parametros.curso, parametros.tipo)}
            cursos={cursos}
            tipos={tipos}
            esHoy={esHoy}
            editar={(tarea) => <BotonEditarTarea tarea={tarea} cursos={cursos} tipos={tipos} />}
          />
        )}
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
