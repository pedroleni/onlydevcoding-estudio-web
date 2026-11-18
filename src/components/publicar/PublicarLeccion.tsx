import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { Contador } from "@/components/publicar/Contador";
import { ElegirPortada } from "@/components/publicar/ElegirPortada";
import { PestanasRed } from "@/components/publicar/PestanasRed";
import { SelectorPieza } from "@/components/publicar/SelectorPieza";
import { LIMITES_PUBLICACION } from "@/lib/limites";
import type { VistaPublicacion } from "@/lib/tipos";

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
    <div role="tabpanel" className="grid min-w-0 gap-8">
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
            <PestanasRed
              key={`${pieza.id}-${red.red}`}
              curso={vista.curso}
              numero={vista.numero}
              pieza={pieza}
              redInicial={red.red}
            />
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
        </div>
      )}

      {vista.notas !== null ? (
        <section aria-labelledby="notas-publicacion-titulo" className="border border-borde bg-superficie">
          <div className="flex items-center justify-between gap-4 border-b border-borde px-4 py-3">
            <div className="flex items-center gap-3">
              <h2 id="notas-publicacion-titulo" className="text-sm font-semibold">
                Notas generales
              </h2>
              <Contador
                valor={vista.notas}
                limite={LIMITES_PUBLICACION.notas}
              />
            </div>
            <BotonCopiar texto={vista.notas} contexto="las notas generales" />
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
            <Contador
              valor={vista.despues_de_publicar.length}
              limite={LIMITES_PUBLICACION.maximoLineas}
              unidad="tareas"
            />
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
                <Contador
                  valor={tarea}
                  limite={LIMITES_PUBLICACION.caracteresPorLinea}
                />
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
