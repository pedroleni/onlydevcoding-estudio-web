"use client";

import { useState } from "react";

import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { Contador } from "@/components/publicar/Contador";
import { EditorTextosRed } from "@/components/publicar/EditorTextosRed";
import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";
import { LIMITES_PUBLICACION, limiteTextoRed } from "@/lib/limites";
import { urlMedio } from "@/lib/medios";
import { nombreRed } from "@/lib/redes-publicacion";
import type { RedVista, TextosRed as TextosRedDatos } from "@/lib/tipos";

function CampoTexto({
  titulo,
  texto,
  limite,
  contexto,
}: {
  titulo: string;
  texto: string;
  limite?: number;
  contexto: string;
}) {
  return (
    <section aria-label={titulo} className="border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          {limite === undefined ? null : (
            <Contador valor={texto} limite={limite} />
          )}
        </div>
        <BotonCopiar texto={texto} contexto={contexto} />
      </div>
      <p className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-texto">
        {texto}
      </p>
    </section>
  );
}

export function PanelTextosRed({
  curso,
  numero,
  pieza,
  red,
  textos,
  fechaPropuesta,
  video,
  vertical = false,
}: {
  curso: string;
  numero: number;
  pieza: string;
  red: RedVista["red"];
  textos: TextosRedDatos | null;
  fechaPropuesta: string | null;
  // Vídeo que se sube a esta red: el propio de la red o, en reels y shorts, el de la pieza.
  video?: string | null;
  vertical?: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmacion, setConfirmacion] = useState<string | null>(null);

  if (editando) {
    return (
      <EditorTextosRed
        curso={curso}
        numero={numero}
        pieza={pieza}
        red={red}
        textos={textos}
        onCancelar={() => setEditando(false)}
        onGuardado={(mensaje) => {
          setConfirmacion(mensaje);
          setEditando(false);
        }}
      />
    );
  }

  const controles = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {confirmacion ? (
        <p role="status" className="text-sm text-marca">
          {confirmacion}
        </p>
      ) : (
        <span />
      )}
      <button
        type="button"
        onClick={() => {
          setConfirmacion(null);
          setEditando(true);
        }}
        className="min-h-11 border border-marca px-4 text-sm font-semibold text-marca transition-colors hover:bg-marca hover:text-fondo"
      >
        Editar
      </button>
    </div>
  );

  const videoRed = video === undefined ? (textos?.video ?? null) : video;
  const bloqueVideo = videoRed ? (
    <section aria-labelledby="video-red-titulo">
      <h3 id="video-red-titulo" className="text-sm font-semibold">
        Vídeo para {nombreRed(red)}
      </h3>
      <video
        src={urlMedio(videoRed)}
        controls
        preload="metadata"
        playsInline
        className={`mt-3 border border-borde bg-carbon object-contain ${
          vertical ? "mx-auto aspect-[9/16] max-h-[70vh] w-auto max-w-full" : "aspect-video w-full"
        }`}
      />
    </section>
  ) : null;

  if (textos === null) {
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
        {controles}
        {bloqueVideo}
        <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
          Esta red todavía no tiene textos preparados.
        </p>
        {fechaPropuesta ? (
          <p className="text-sm text-tenue">
            Fecha propuesta: {fechaPublicacionLegible(fechaPropuesta)}
          </p>
        ) : null}
      </div>
    );
  }

  const etiquetas = textos.etiquetas.join(", ");
  const limiteTexto = limiteTextoRed(red);
  const titulos = textos.titulos.filter((titulo) => titulo !== "");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {controles}
      {bloqueVideo}
      {titulos.length > 0 ? (
        <section aria-labelledby="titulos-red" className="grid gap-3">
          <h3 id="titulos-red" className="text-sm font-semibold uppercase tracking-[0.14em] text-tenue">
            Títulos
          </h3>
          {titulos.map((titulo, indice) => (
            <div
              key={`${indice}-${titulo}`}
              className="border border-borde bg-superficie p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {indice === 0 ? (
                    <span className="mb-2 inline-block bg-marca px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-fondo">
                      Recomendado
                    </span>
                  ) : null}
                  <p className="break-words text-sm leading-6">{titulo}</p>
                </div>
                <BotonCopiar
                  texto={titulo}
                  contexto={`el título ${indice + 1}`}
                />
              </div>
              {red === "youtube" ? (
                <div className="mt-3">
                  <Contador
                    valor={titulo}
                    limite={LIMITES_PUBLICACION.tituloYoutube}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {textos.descripcion ? (
        <CampoTexto
          titulo="Descripción"
          texto={textos.descripcion}
          limite={
            red === "youtube"
              ? LIMITES_PUBLICACION.descripcionYoutube
              : undefined
          }
          contexto="la descripción"
        />
      ) : null}

      {textos.etiquetas.some((etiqueta) => etiqueta !== "") ? (
        <CampoTexto
          titulo="Etiquetas"
          texto={etiquetas}
          limite={
            red === "youtube"
              ? LIMITES_PUBLICACION.etiquetasYoutube
              : undefined
          }
          contexto="las etiquetas"
        />
      ) : null}

      {textos.texto ? (
        <CampoTexto
          titulo="Texto"
          texto={textos.texto}
          limite={limiteTexto ?? undefined}
          contexto="el texto"
        />
      ) : null}

      {textos.comentario_fijado ? (
        <CampoTexto
          titulo="Comentario fijado"
          texto={textos.comentario_fijado}
          limite={LIMITES_PUBLICACION.comentarioFijado}
          contexto="el comentario fijado"
        />
      ) : null}

      {textos.ajustes.length > 0 ? (
        <section className="border border-borde bg-superficie p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Ajustes de Studio</h3>
            <Contador
              valor={textos.ajustes.length}
              limite={LIMITES_PUBLICACION.maximoLineas}
              unidad="líneas"
            />
          </div>
          <ul className="mt-3 grid gap-2 text-sm text-tenue">
            {textos.ajustes.map((ajuste, indice) => (
              <li key={`${indice}-${ajuste}`} className="flex gap-3">
                <span aria-hidden="true" className="text-marca">—</span>
                <span className="min-w-0 flex-1 break-words">{ajuste}</span>
                <Contador
                  valor={ajuste}
                  limite={LIMITES_PUBLICACION.caracteresPorLinea}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {textos.notas ? (
        <CampoTexto
          titulo="Notas"
          texto={textos.notas}
          limite={LIMITES_PUBLICACION.notas}
          contexto="las notas"
        />
      ) : null}


      {fechaPropuesta ? (
        <p className="border-l-2 border-marca pl-3 text-sm text-tenue">
          Fecha propuesta: {fechaPublicacionLegible(fechaPropuesta)}
        </p>
      ) : null}
    </div>
  );
}
