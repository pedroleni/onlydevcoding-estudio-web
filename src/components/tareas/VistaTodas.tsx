import type { ReactNode } from "react";

import { FilaTarea } from "@/components/tareas/FilaTarea";
import type { TareaVista, TipoTarea } from "@/lib/tipos";
import { agruparPorLeccion, COLOR_DESCONOCIDO, colorSeguro } from "@/lib/vista-tareas";

// Lista total de tareas sin día, una sección plegable por lección. La lección en curso
// (la primera con algo pendiente) se abre sola.
export function VistaTodas({
  tareas,
  tipos,
  editar,
}: {
  tareas: TareaVista[];
  tipos: TipoTarea[];
  editar?: (tarea: TareaVista) => ReactNode;
}) {
  const colorDe = (id: string) =>
    colorSeguro(tipos.find((tipo) => tipo.id === id)?.color ?? COLOR_DESCONOCIDO);
  const grupos = agruparPorLeccion(tareas);
  const total = tareas.length;
  const hechas = tareas.filter((tarea) => tarea.hecha).length;
  const primeraAbierta = grupos.find((grupo) => grupo.hechas < grupo.tareas.length)?.clave;

  if (total === 0) {
    return (
      <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
        No hay tareas sin día
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-tenue">
        <span className="font-mono text-texto">{total - hechas}</span> pendientes de{" "}
        <span className="font-mono text-texto">{total}</span> en {grupos.length}{" "}
        {grupos.length === 1 ? "grupo" : "grupos"}. Elige un día en la tarea para pasarla al
        calendario.
      </p>
      {grupos.map((grupo) => {
        const completa = grupo.hechas === grupo.tareas.length;
        const porcentaje = Math.round((grupo.hechas / grupo.tareas.length) * 100);
        return (
          <details
            key={grupo.clave}
            open={grupo.clave === primeraAbierta}
            className="group border border-borde bg-superficie/40"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-superficie">
              <span
                aria-hidden="true"
                className="text-xs text-tenue transition-transform group-open:rotate-90"
              >
                ▶
              </span>
              <span
                className={`min-w-0 flex-1 truncate font-medium ${completa ? "text-tenue line-through" : "text-texto"}`}
              >
                {grupo.titulo}
              </span>
              <span className="hidden h-1.5 w-24 shrink-0 overflow-hidden bg-borde sm:block">
                <span
                  className="block h-full bg-marca"
                  style={{ width: `${porcentaje}%` }}
                />
              </span>
              <span className="shrink-0 font-mono text-xs text-tenue">
                {grupo.hechas}/{grupo.tareas.length}
              </span>
            </summary>
            <ul className="grid gap-2 px-2 pb-3 sm:px-4">
              {grupo.tareas.map((tarea) => (
                <FilaTarea
                  key={tarea.id}
                  tarea={tarea}
                  color={colorDe(tarea.tipo)}
                  ponerDia
                  editar={editar?.(tarea)}
                />
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
