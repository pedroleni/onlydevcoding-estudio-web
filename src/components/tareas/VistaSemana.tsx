import Link from "next/link";

import { diasDeSemana, fechaLegible } from "@/lib/fechas";
import type { TareaVista, TipoTarea } from "@/lib/tipos";
import {
  COLOR_DESCONOCIDO,
  compararTareas,
  filtrarTareas,
  hrefTareas,
  type ParametrosTareas,
} from "@/lib/vista-tareas";

function cabeceraCorta(fecha: string): string {
  return fechaLegible(fecha).split(" ").slice(0, 2).join(" ");
}

export function VistaSemana({
  tareas,
  tipos,
  parametros,
}: {
  tareas: TareaVista[];
  tipos: TipoTarea[];
  parametros: ParametrosTareas;
}) {
  const visibles = filtrarTareas(tareas, parametros.curso, parametros.tipo);
  const tipoDe = (id: string) => tipos.find((tipo) => tipo.id === id);

  return (
    <ul className="grid gap-3 md:grid-cols-7">
      {diasDeSemana(parametros.dia).map((dia) => {
        const delDia = visibles.filter((tarea) => tarea.fecha === dia).sort(compararTareas);
        return (
          <li key={dia} data-dia={dia} className="min-w-0 border border-borde bg-superficie p-3">
            <h2 className="text-sm font-semibold">
              <Link
                href={hrefTareas(parametros, { vista: "dia", dia })}
                aria-label={fechaLegible(dia)}
                className="hover:text-marca focus-visible:outline-2 focus-visible:outline-marca"
              >
                {cabeceraCorta(dia)}
              </Link>
            </h2>
            {delDia.length === 0 ? (
              <p className="mt-2 text-xs text-tenue">Sin tareas</p>
            ) : (
              <ul className="mt-2 grid gap-1.5">
                {delDia.map((tarea) => (
                  <li
                    key={tarea.id}
                    className="flex min-w-0 items-baseline gap-1.5 border-l-2 pl-2 text-xs"
                    style={{ borderLeftColor: tipoDe(tarea.tipo)?.color ?? COLOR_DESCONOCIDO }}
                  >
                    <span className="sr-only">
                      {`${tipoDe(tarea.tipo)?.nombre ?? tarea.tipo}${tarea.hecha ? ", hecha" : ""}:`}
                    </span>
                    {tarea.hora ? (
                      <span className="shrink-0 font-mono text-tenue">{tarea.hora}</span>
                    ) : null}
                    <span
                      title={tarea.texto}
                      className={`line-clamp-2 break-words ${tarea.hecha ? "text-tenue line-through" : "text-texto"}`}
                    >
                      {tarea.texto}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
