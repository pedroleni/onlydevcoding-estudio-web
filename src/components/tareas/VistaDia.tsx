import type { ReactNode } from "react";

import { FilaTarea } from "@/components/tareas/FilaTarea";
import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";
import { agruparDia } from "@/lib/vista-tareas";

const COLOR_DESCONOCIDO = "#9B9BA4";

export function VistaDia({
  tareas,
  atrasadas,
  cursos,
  tipos,
  esHoy,
  editar,
}: {
  tareas: TareaVista[];
  atrasadas: TareaVista[];
  cursos: Curso[];
  tipos: TipoTarea[];
  esHoy: boolean;
  editar?: (tarea: TareaVista) => ReactNode;
}) {
  const colorDe = (id: string) =>
    tipos.find((tipo) => tipo.id === id)?.color ?? COLOR_DESCONOCIDO;
  const grupos = agruparDia(tareas, cursos, tipos);
  const verAtrasadas = esHoy && atrasadas.length > 0;

  return (
    <div className="grid gap-8">
      {verAtrasadas ? (
        <section
          aria-labelledby="tareas-atrasadas"
          className="border border-[#E8A33D]/50 p-4 md:p-5"
        >
          <h2 id="tareas-atrasadas" className="text-lg font-semibold text-[#E8A33D]">
            Atrasadas
          </h2>
          <ul className="mt-3 grid gap-2">
            {atrasadas.map((tarea) => (
              <FilaTarea
                key={tarea.id}
                tarea={tarea}
                color={colorDe(tarea.tipo)}
                mostrarFecha
                editar={editar?.(tarea)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {grupos.length === 0 ? (
        <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
          No hay tareas para este día
        </p>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.curso ?? "sin-curso"} className="grid gap-4">
            <h2 className="text-xl font-semibold">{grupo.nombre}</h2>
            {grupo.tipos.map(({ tipo, tareas: delTipo }) => (
              <div key={tipo.id}>
                <h3 className="flex items-center gap-2 text-sm font-medium text-tenue">
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: tipo.color }}
                  />
                  {tipo.nombre}
                </h3>
                <ul className="mt-2 grid gap-2">
                  {delTipo.map((tarea) => (
                    <FilaTarea
                      key={tarea.id}
                      tarea={tarea}
                      color={tipo.color}
                      editar={editar?.(tarea)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}
