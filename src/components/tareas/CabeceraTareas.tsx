import Link from "next/link";
import type { ReactNode } from "react";

import { fechaLegible, lunesDe, sumarDias } from "@/lib/fechas";
import type { Curso, TipoTarea } from "@/lib/tipos";
import { hrefTareas, SIN_CURSO, type ParametrosTareas } from "@/lib/vista-tareas";

const claseBoton =
  "inline-flex min-h-10 items-center border border-borde px-3 text-sm hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca";

export function CabeceraTareas({
  parametros,
  hoy,
  cursos,
  tipos,
  accion,
}: {
  parametros: ParametrosTareas;
  hoy: string;
  cursos: Curso[];
  tipos: TipoTarea[];
  accion?: ReactNode;
}) {
  const semana = parametros.vista === "semana";
  const paso = semana ? 7 : 1;
  const referencia = semana ? lunesDe(parametros.dia) : parametros.dia;
  const anterior = sumarDias(referencia, -paso);
  const siguiente = sumarDias(referencia, paso);
  const yaEsHoy = semana ? lunesDe(hoy) === referencia : parametros.dia === hoy;

  return (
    <header className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={hrefTareas(parametros, { dia: anterior })}
            aria-label={`${semana ? "Semana anterior" : "Día anterior"}: ${fechaLegible(anterior)}`}
            className={`${claseBoton} text-tenue`}
          >
            ‹ {fechaLegible(anterior)}
          </Link>
          <h1 className="px-2 text-2xl font-semibold tracking-[-0.03em] md:text-3xl">
            {semana ? `Semana del ${fechaLegible(referencia)}` : fechaLegible(parametros.dia)}
          </h1>
          <Link
            href={hrefTareas(parametros, { dia: siguiente })}
            aria-label={`${semana ? "Semana siguiente" : "Día siguiente"}: ${fechaLegible(siguiente)}`}
            className={`${claseBoton} text-tenue`}
          >
            {fechaLegible(siguiente)} ›
          </Link>
          {yaEsHoy ? null : (
            <Link href={hrefTareas(parametros, { dia: hoy })} className={`${claseBoton} text-marca`}>
              Hoy
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Vista" className="flex">
            {(
              [
                ["dia", "Día"],
                ["semana", "Semana"],
              ] as const
            ).map(([vista, etiqueta]) => {
              const activa = parametros.vista === vista;
              return (
                <Link
                  key={vista}
                  href={hrefTareas(parametros, { vista })}
                  aria-current={activa ? "page" : undefined}
                  className={`${claseBoton} ${activa ? "border-marca bg-marca/15 text-texto" : "text-tenue"}`}
                >
                  {etiqueta}
                </Link>
              );
            })}
          </nav>
          <Link href="/tareas/tipos" className={`${claseBoton} text-tenue`}>
            Tipos
          </Link>
          {accion}
        </div>
      </div>

      {/* La clave reinicia los <select> no controlados al navegar entre filtros. */}
      <form
        key={`${parametros.curso ?? ""}|${parametros.tipo ?? ""}`}
        method="get"
        action="/tareas"
        className="flex flex-wrap items-end gap-3 text-sm"
      >
        <input type="hidden" name="vista" value={parametros.vista} />
        <input type="hidden" name="dia" value={parametros.dia} />
        <div className="grid gap-1 text-tenue">
          <label htmlFor={"filtro-curso"}>Curso</label>
          <select
            id={"filtro-curso"}
            name="curso"
            defaultValue={parametros.curso ?? ""}
            className="min-h-10 border border-borde bg-superficie px-2 text-texto"
          >
            <option value="">Todos</option>
            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
            <option value={SIN_CURSO}>Sin curso</option>
          </select>
        </div>
        <div className="grid gap-1 text-tenue">
          <label htmlFor={"filtro-tipo"}>Tipo</label>
          <select
            id={"filtro-tipo"}
            name="tipo"
            defaultValue={parametros.tipo ?? ""}
            className="min-h-10 border border-borde bg-superficie px-2 text-texto"
          >
            <option value="">Todos</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={`${claseBoton} text-texto`}>
          Filtrar
        </button>
      </form>
    </header>
  );
}
