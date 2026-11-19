"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { PanelVideoFinal } from "@/components/acciones/PanelVideoFinal";
import { urlMedio } from "@/lib/medios";
import { redVideoLinkedin, TITULO_VIDEO_LINKEDIN } from "@/lib/redes-publicacion";
import { etiquetaPrevia, previaPorDefecto } from "@/lib/numero-previa";
import type { EstadoAccion, Pieza, PiezaVista } from "@/lib/tipos";

function Reproductor({
  ruta,
  etiqueta,
  poster,
  fotogramaInicial = false,
  vertical = false,
}: {
  ruta: string;
  etiqueta: string;
  poster?: string;
  fotogramaInicial?: boolean;
  vertical?: boolean;
}) {
  return (
    <video
      className={`${vertical ? "aspect-[9/16]" : "aspect-video"} w-full bg-carbon object-contain`}
      src={`${urlMedio(ruta)}${fotogramaInicial ? "#t=1" : ""}`}
      poster={poster ? urlMedio(poster) : undefined}
      controls
      preload="metadata"
      playsInline
      aria-label={etiqueta}
    />
  );
}

const TIPO_PIEZA: Record<Pieza["tipo"], string> = {
  short: "Short",
  reel: "Reel de salida",
  leccion: "Lección",
};

function nombreArchivo(ruta: string): string {
  return ruta.split("/").at(-1) ?? ruta;
}

function enlacePublicar(id: string): string {
  return `?pestana=publicar&pieza=${encodeURIComponent(id)}`;
}

const ENLACE =
  "font-medium text-marca underline-offset-4 hover:text-texto hover:underline";

function EstadoPortada({
  pieza,
  detalle,
  portadas,
}: {
  pieza: Pieza;
  detalle: PiezaVista | null;
  portadas: string[];
}) {
  if (portadas.length === 0) return null;

  const enlace = (texto: string) => (
    <Link href={enlacePublicar(pieza.id)} className={ENLACE}>
      {texto}
    </Link>
  );

  // Sin la vista de publicación no se sabe cuál está elegida: solo se ofrece ir a elegirla.
  if (detalle === null) {
    return <p className="text-xs">{enlace("Elegir en Publicar")}</p>;
  }
  if (detalle.portada_elegida && portadas.includes(detalle.portada_elegida)) {
    return <p className="text-xs">{enlace("Cambiar en Publicar")}</p>;
  }
  return (
    <p className="text-xs text-tenue">
      Sin elegir · {enlace("Elegir en Publicar")}
    </p>
  );
}

function TarjetaPieza({
  pieza,
  detalle,
}: {
  pieza: Pieza;
  detalle: PiezaVista | null;
}) {
  const prefijo = useId();
  const elegida = detalle?.portada_elegida ?? null;
  // La vista de publicación suma a las portadas del disco las candidatas de publicacion.json.
  const portadas = detalle?.portadas ?? pieza.portadas;

  return (
    <article
      aria-labelledby={`${prefijo}-titulo`}
      className="min-w-0 border border-borde bg-superficie"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-borde px-5 py-4">
        <span className="shrink-0 border border-marca bg-carbon px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-marca">
          {TIPO_PIEZA[pieza.tipo]}
        </span>
        <h3
          id={`${prefijo}-titulo`}
          className="min-w-0 flex-1 text-lg font-semibold tracking-[-0.02em] break-words"
        >
          {pieza.titulo}
        </h3>
        <span className="shrink-0 font-mono text-xs text-tenue">
          {detalle?.duracion ?? "Duración pendiente"}
        </span>
      </header>

      <div className="grid gap-6 p-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
        <section aria-labelledby={`${prefijo}-video`} className="min-w-0">
          <h4
            id={`${prefijo}-video`}
            className="text-xs font-semibold uppercase tracking-[0.12em] text-tenue"
          >
            Vídeo
          </h4>
          {pieza.video ? (
            <>
              <div className="mt-3 max-w-48 overflow-hidden border border-borde">
                <Reproductor
                  ruta={pieza.video}
                  poster={elegida ?? portadas[0]}
                  etiqueta={`Vídeo de ${pieza.titulo}`}
                  vertical
                />
              </div>
              <p className="mt-2 break-all font-mono text-xs text-tenue">
                {nombreArchivo(pieza.video)}
              </p>
            </>
          ) : (
            <div className="mt-3 flex aspect-[9/16] max-w-48 items-center justify-center border border-borde bg-carbon p-4 text-center text-sm text-tenue">
              Vídeo pendiente
            </div>
          )}
        </section>

        <section aria-labelledby={`${prefijo}-portadas`} className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h4
              id={`${prefijo}-portadas`}
              className="text-xs font-semibold uppercase tracking-[0.12em] text-tenue"
            >
              Portadas propuestas ({portadas.length})
            </h4>
            <EstadoPortada pieza={pieza} detalle={detalle} portadas={portadas} />
          </div>
          {portadas.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-5">
              {portadas.map((portada, indice) => {
                const esElegida = portada === elegida;
                return (
                  <figure
                    key={`${pieza.id}-${portada}`}
                    className={`relative border bg-carbon ${
                      esElegida ? "border-marca" : "border-borde"
                    }`}
                  >
                    {/* Las imágenes proceden de la API local y no tienen dimensiones fijas. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="aspect-[9/16] w-full bg-carbon object-contain"
                      src={urlMedio(portada)}
                      alt={`Portada ${indice + 1} de ${pieza.titulo}`}
                      loading="lazy"
                    />
                    {esElegida ? (
                      <figcaption className="absolute bottom-1.5 left-1.5 bg-marca px-1.5 py-0.5 text-[0.7rem] font-bold text-fondo">
                        ✓ Elegida
                      </figcaption>
                    ) : null}
                  </figure>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-tenue">Sin portadas todavía.</p>
          )}
        </section>
      </div>
    </article>
  );
}

export function ListaPiezas({
  piezas,
  detalles = null,
}: {
  piezas: Pieza[];
  // Vista de publicación de la lección: da la duración y la portada elegida de cada pieza.
  detalles?: PiezaVista[] | null;
}) {
  const leccion = detalles?.find(({ tipo }) => tipo === "leccion") ?? null;
  const linkedin = leccion ? redVideoLinkedin(leccion) : null;
  const videoLinkedin = linkedin?.textos?.video ? (
    <section
      aria-labelledby="video-linkedin-titulo"
      className="border border-borde bg-superficie p-4 md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="video-linkedin-titulo" className="text-lg font-semibold">
          {TITULO_VIDEO_LINKEDIN}
        </h2>
        <span
          className={`border px-2 py-1 text-xs font-semibold ${
            linkedin.estado.estado === "publicado"
              ? "border-verde/50 bg-verde/15 text-verde"
              : "border-borde bg-carbon text-tenue"
          }`}
        >
          {linkedin.estado.estado === "publicado"
            ? "✅ Subido"
            : linkedin.estado.estado === "programado"
              ? "📅 Programado"
              : "⬜ Pendiente"}
        </span>
      </div>
      <p className="mt-1 text-sm text-tenue">
        El vídeo recortado para LinkedIn a partir de la lección.
      </p>
      <video
        src={urlMedio(linkedin.textos.video)}
        controls
        preload="metadata"
        playsInline
        className="mt-3 aspect-video w-full max-w-2xl border border-borde bg-carbon object-contain"
      />
      <Link
        href={`?pestana=publicar&pieza=${encodeURIComponent(leccion?.id ?? "leccion")}&red=linkedin`}
        className="mt-3 inline-block text-sm font-medium text-marca hover:text-texto"
      >
        Textos y estado en Publicar →
      </Link>
    </section>
  ) : null;

  if (piezas.length === 0) {
    return (
      <div className="grid gap-5">
        {videoLinkedin}
        <p className="border border-borde bg-superficie p-6 text-sm text-tenue">
          Todavía no hay shorts ni reels para esta lección.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="piezas-titulo" className="grid gap-5">
      {videoLinkedin}
      <div>
        <h2 id="piezas-titulo" className="text-xl font-semibold">
          Piezas para publicar
        </h2>
        <p className="mt-1 text-sm text-tenue">
          Cada short y reel con su vídeo y las portadas propuestas.
        </p>
      </div>
      {piezas.map((pieza) => (
        <TarjetaPieza
          key={pieza.id}
          pieza={pieza}
          detalle={detalles?.find(({ id }) => id === pieza.id) ?? null}
        />
      ))}
    </section>
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
  const ultima = previaPorDefecto(previas);
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
            <div
              className="flex max-w-full min-w-0 flex-wrap gap-2"
              aria-label="Elegir una previa"
            >
              {previasRecientes.map((previa, indice) => (
                <button
                  key={`${previa}-${indice}`}
                  type="button"
                  aria-pressed={previa === previaActiva}
                  onClick={() => setPreviaElegida(previa)}
                  className="min-h-11 border border-borde bg-superficie px-4 text-sm font-medium text-tenue transition-colors hover:border-marca hover:text-texto active:translate-y-px aria-pressed:border-marca aria-pressed:text-texto"
                >
                  {etiquetaPrevia(previa) ?? `Previa ${previasRecientes.length - indice}`}
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
