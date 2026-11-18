"use client";

import { useState } from "react";

import { PanelVideoFinal } from "@/components/acciones/PanelVideoFinal";
import { urlMedio } from "@/lib/medios";
import { numeroPrevia } from "@/lib/numero-previa";
import type { EstadoAccion, Pieza } from "@/lib/tipos";

function Reproductor({
  ruta,
  etiqueta,
  poster,
  fotogramaInicial = false,
}: {
  ruta: string;
  etiqueta: string;
  poster?: string;
  fotogramaInicial?: boolean;
}) {
  return (
    <video
      className="aspect-video w-full bg-carbon object-contain"
      src={`${urlMedio(ruta)}${fotogramaInicial ? "#t=1" : ""}`}
      poster={poster ? urlMedio(poster) : undefined}
      controls
      preload="metadata"
      playsInline
      aria-label={etiqueta}
    />
  );
}

export function ListaPiezas({ piezas }: { piezas: Pieza[] }) {
  if (piezas.length === 0) {
    return (
      <p className="border border-borde bg-superficie p-6 text-sm text-tenue">
        Todavía no hay shorts ni reels para esta lección.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {piezas.map((pieza) => (
        <article
          key={pieza.id}
          className="overflow-hidden border border-borde bg-superficie"
        >
          {pieza.video ? (
            <Reproductor
              ruta={pieza.video}
              poster={pieza.portadas[0]}
              etiqueta={`Vídeo de ${pieza.titulo}`}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-carbon p-6 text-sm text-tenue">
              Vídeo pendiente
            </div>
          )}

          <div className="p-5">
            <h3 className="text-lg font-semibold tracking-[-0.02em]">
              {pieza.titulo}
            </h3>
            {pieza.portadas.length > 0 ? (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {pieza.portadas.map((portada, indice) => (
                  // Las imágenes proceden de la API local y no tienen dimensiones fijas.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${pieza.id}-${portada}`}
                    className="aspect-[9/16] w-full border border-borde bg-carbon object-contain"
                    src={urlMedio(portada)}
                    alt={`Portada ${indice + 1} de ${pieza.titulo}`}
                    loading="lazy"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-tenue">Sin portadas todavía.</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function VistaVideoFinal({
  curso,
  numero,
  pieza,
  previas,
  acciones,
}: {
  curso: string;
  numero: number;
  pieza: Pieza | null;
  previas: string[];
  acciones: EstadoAccion[] | null;
}) {
  const previasRecientes = [...previas].reverse();
  const ultima = previasRecientes[0] ?? null;
  const [previaElegida, setPreviaElegida] = useState<string | null>(null);
  const [ultimaVista, setUltimaVista] = useState(ultima);
  // Tras un render nuevo se pasa a la última; un refresco sin previas nuevas respeta la elección.
  if (ultima !== ultimaVista) {
    setUltimaVista(ultima);
    setPreviaElegida(null);
  }
  const previaActiva =
    previaElegida && previas.includes(previaElegida) ? previaElegida : ultima;

  return (
    <div className="grid gap-8">
      <section aria-labelledby="video-final-titulo">
        <h2 id="video-final-titulo" className="text-xl font-semibold">
          Vídeo final
        </h2>
        <div className="mt-4 overflow-hidden border border-borde bg-superficie">
          {pieza?.video ? (
            <Reproductor
              ruta={pieza.video}
              poster={pieza.portadas[0]}
              etiqueta="Vídeo final de la lección"
            />
          ) : (
            <div className="flex aspect-video items-center justify-center p-6 text-sm text-tenue">
              El vídeo final todavía no está disponible.
            </div>
          )}
        </div>
      </section>

      <PanelVideoFinal
        curso={curso}
        numero={numero}
        previas={previas}
        acciones={acciones}
      />

      <section aria-labelledby="previas-titulo">
        <h2 id="previas-titulo" className="text-xl font-semibold">
          Previas
        </h2>
        {previasRecientes.length > 0 && previaActiva ? (
          <div className="mt-4 grid gap-4">
            <div className="overflow-hidden border border-borde bg-superficie">
              <Reproductor
                ruta={previaActiva}
                etiqueta="Previa seleccionada"
                fotogramaInicial
              />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Elegir una previa">
              {previasRecientes.map((previa, indice) => (
                <button
                  key={previa}
                  type="button"
                  aria-pressed={previa === previaActiva}
                  onClick={() => setPreviaElegida(previa)}
                  className="min-h-11 border border-borde bg-superficie px-4 text-sm font-medium text-tenue transition-colors hover:border-marca hover:text-texto active:translate-y-px aria-pressed:border-marca aria-pressed:text-texto"
                >
                  Previa {numeroPrevia(previa) ?? previasRecientes.length - indice}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-4 border border-borde bg-superficie p-6 text-sm text-tenue">
            Todavía no hay previas de esta lección.
          </p>
        )}
      </section>
    </div>
  );
}
