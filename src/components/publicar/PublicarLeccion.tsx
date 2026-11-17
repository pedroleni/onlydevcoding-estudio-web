import Link from "next/link";

import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { ElegirPortada } from "@/components/publicar/ElegirPortada";
import { EstadoPublicacion } from "@/components/publicar/EstadoPublicacion";
import { SelectorPieza } from "@/components/publicar/SelectorPieza";
import { TextosPublicacionRed } from "@/components/publicar/TextosRed";
import { REDES } from "@/lib/curso";
import {
  LIMITES_PUBLICACION,
  longitudPublicacion,
} from "@/lib/limites";
import type { VistaPublicacion } from "@/lib/tipos";

function nombreRed(id: string): string {
  return REDES.find(([red]) => red === id)?.[1] ?? id;
}

function ContadorLinea({ texto }: { texto: string }) {
  const longitud = longitudPublicacion(texto);
  return (
    <span
      className={`shrink-0 font-mono text-xs ${longitud > LIMITES_PUBLICACION.caracteresPorLinea ? "text-red-400" : "text-tenue"}`}
    >
      {longitud}/{LIMITES_PUBLICACION.caracteresPorLinea}
    </span>
  );
}

export function PublicarLeccion({
  vista,
  piezaSeleccionada,
  redSeleccionada,
}: {
  vista: VistaPublicacion;
  piezaSeleccionada?: string;
  redSeleccionada?: string;
}) {
  const pieza =
    vista.piezas.find(({ id }) => id === piezaSeleccionada) ??
    vista.piezas[0] ??
    null;
  const red =
    pieza?.redes.find(({ red: id }) => id === redSeleccionada) ??
    pieza?.redes.find(({ textos }) => textos !== null) ??
    pieza?.redes[0] ??
    null;
  const sinTextos = vista.piezas.every((elemento) =>
    elemento.redes.every(({ textos }) => textos === null),
  );

  return (
    <div role="tabpanel" className="grid gap-8">
      {vista.error ? (
        <div
          role="alert"
          className="border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {vista.error}
        </div>
      ) : null}
      {vista.aviso ? (
        <div
          role="status"
          className="border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200"
        >
          {vista.aviso}
        </div>
      ) : null}

      {vista.piezas.length > 0 && pieza ? (
        <>
          <SelectorPieza piezas={vista.piezas} activa={pieza.id} />

          <ElegirPortada
            key={`portadas-${pieza.id}`}
            curso={vista.curso}
            numero={vista.numero}
            pieza={pieza}
          />

          {sinTextos && !vista.error ? (
            <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
              Esta lección todavía no tiene textos de publicación
            </p>
          ) : null}

          {red ? (
            <section aria-labelledby="red-publicacion-titulo">
              <h2 id="red-publicacion-titulo" className="text-xl font-semibold">
                Publicación por red
              </h2>
              <nav aria-label="Redes de publicación" className="mt-4 overflow-x-auto">
                <div
                  role="tablist"
                  className="flex min-w-max border-b border-borde"
                >
                  {pieza.redes.map((redVista) => {
                    const seleccionada = redVista.red === red.red;
                    return (
                      <Link
                        key={redVista.red}
                        href={`?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}&red=${encodeURIComponent(redVista.red)}`}
                        role="tab"
                        aria-selected={seleccionada}
                        aria-current={seleccionada ? "page" : undefined}
                        className="inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-tenue transition-colors hover:text-texto aria-[selected=true]:border-marca aria-[selected=true]:text-texto"
                      >
                        {nombreRed(redVista.red)}
                        {redVista.textos ? (
                          <span
                            aria-hidden="true"
                            title="Con textos"
                            className="h-1.5 w-1.5 rounded-full bg-marca"
                          />
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
                <TextosPublicacionRed
                  red={red.red}
                  textos={red.textos}
                  fechaPropuesta={pieza.fecha_propuesta}
                />
                <EstadoPublicacion
                  key={`${pieza.id}-${red.red}`}
                  curso={vista.curso}
                  numero={vista.numero}
                  pieza={pieza.id}
                  red={red.red}
                  nombreRed={nombreRed(red.red)}
                  estado={red.estado}
                  fechaPropuesta={pieza.fecha_propuesta}
                />
              </div>
            </section>
          ) : (
            <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
              Esta pieza no tiene redes de publicación.
            </p>
          )}
        </>
      ) : (
        <div className="border border-borde bg-superficie p-6">
          <h2 className="text-xl font-semibold">Publicar</h2>
          <p className="mt-2 text-sm text-tenue">
            Esta lección todavía no tiene piezas para publicar.
          </p>
          {!vista.error ? (
            <p className="mt-2 text-sm text-tenue">
              Esta lección todavía no tiene textos de publicación
            </p>
          ) : null}
        </div>
      )}

      {vista.notas !== null ? (
        <section aria-labelledby="notas-publicacion-titulo" className="border border-borde bg-superficie">
          <div className="flex items-center justify-between gap-4 border-b border-borde px-4 py-3">
            <div className="flex items-center gap-3">
              <h2 id="notas-publicacion-titulo" className="text-sm font-semibold">
                Notas generales
              </h2>
              <span
                className={`font-mono text-xs ${longitudPublicacion(vista.notas) > LIMITES_PUBLICACION.notas ? "text-red-400" : "text-tenue"}`}
              >
                {longitudPublicacion(vista.notas)}/{LIMITES_PUBLICACION.notas}
              </span>
            </div>
            <BotonCopiar texto={vista.notas} />
          </div>
          <p className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-tenue">
            {vista.notas}
          </p>
        </section>
      ) : null}

      {vista.despues_de_publicar.length > 0 ? (
        <section aria-labelledby="despues-publicar-titulo">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="despues-publicar-titulo" className="text-xl font-semibold">
              Después de publicar
            </h2>
            <span
              className={`font-mono text-xs ${vista.despues_de_publicar.length > LIMITES_PUBLICACION.maximoLineas ? "text-red-400" : "text-tenue"}`}
            >
              {vista.despues_de_publicar.length}/{LIMITES_PUBLICACION.maximoLineas} tareas
            </span>
          </div>
          <ol className="mt-4 grid gap-2">
            {vista.despues_de_publicar.map((tarea, indice) => (
              <li
                key={`${indice}-${tarea}`}
                className="flex gap-3 border border-borde bg-superficie p-4 text-sm"
              >
                <span className="font-mono text-marca">
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 break-words">{tarea}</span>
                <ContadorLinea texto={tarea} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
