import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { CabeceraTareas } from "@/components/tareas/CabeceraTareas";
import {
  BotonEditarTarea,
  BotonNuevaTarea,
} from "@/components/tareas/FormularioTarea";
import { VistaDia } from "@/components/tareas/VistaDia";
import { VistaSemana } from "@/components/tareas/VistaSemana";
import { VistaTodas } from "@/components/tareas/VistaTodas";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerTareas,
  obtenerTareasSinFecha,
  obtenerTiposTarea,
} from "@/lib/api";
import { diasDeSemana, fechaLocal } from "@/lib/fechas";
import type { Curso, TareasDelRango, TareaVista, TipoTarea } from "@/lib/tipos";
import {
  filtrarTareas,
  leerParametrosTareas,
  type ParametrosTareas,
} from "@/lib/vista-tareas";

// Lo que pide cada vista: la lista total sin fecha, una semana o un día (con atrasadas si es hoy).
function pedirTareas(
  parametros: ParametrosTareas,
  hoy: string,
): Promise<TareasDelRango> {
  if (parametros.vista === "todas") {
    return obtenerTareasSinFecha().then((tareas) => ({
      tareas,
      atrasadas: [],
    }));
  }
  if (parametros.vista === "semana") {
    const dias = diasDeSemana(parametros.dia);
    return obtenerTareas(dias[0], dias[6], false);
  }
  return obtenerTareas(parametros.dia, parametros.dia, parametros.dia === hoy);
}

function VistaElegida({
  parametros,
  hoy,
  datos,
  cursos,
  tipos,
}: {
  parametros: ParametrosTareas;
  hoy: string;
  datos: TareasDelRango;
  cursos: Curso[];
  tipos: TipoTarea[];
}) {
  const editar = (tarea: TareaVista) => (
    <BotonEditarTarea tarea={tarea} cursos={cursos} tipos={tipos} />
  );
  const filtradas = (lista: TareaVista[]) =>
    filtrarTareas(lista, parametros.curso, parametros.tipo);

  switch (parametros.vista) {
    case "todas":
      return (
        <VistaTodas
          tareas={filtradas(datos.tareas)}
          tipos={tipos}
          editar={editar}
        />
      );
    case "semana":
      return (
        <VistaSemana
          tareas={datos.tareas}
          tipos={tipos}
          parametros={parametros}
        />
      );
    case "dia":
      return (
        <VistaDia
          tareas={filtradas(datos.tareas)}
          atrasadas={filtradas(datos.atrasadas)}
          cursos={cursos}
          tipos={tipos}
          esHoy={parametros.dia === hoy}
          editar={editar}
        />
      );
  }
}

async function ContenidoTareas({
  searchParams,
}: {
  searchParams: PageProps<"/tareas">["searchParams"];
}) {
  const consulta = await searchParams;
  await connection();

  const hoy = fechaLocal(new Date());
  const parametros = leerParametrosTareas(consulta, hoy);

  let datos;
  let cursos;
  let tipos;
  try {
    [datos, cursos, tipos] = await Promise.all([
      pedirTareas(parametros, hoy),
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
        accion={
          <BotonNuevaTarea
            cursos={cursos}
            tipos={tipos}
            fecha={parametros.vista === "todas" ? null : parametros.dia}
          />
        }
      />
      <div className="mt-8">
        <VistaElegida
          parametros={parametros}
          hoy={hoy}
          datos={datos}
          cursos={cursos}
          tipos={tipos}
        />
      </div>
    </>
  );
}

export default function Tareas({ searchParams }: PageProps<"/tareas">) {
  return (
    <section className="py-8 md:py-12">
      <Suspense
        fallback={<p className="text-sm text-tenue">Cargando tareas…</p>}
      >
        <ContenidoTareas searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
