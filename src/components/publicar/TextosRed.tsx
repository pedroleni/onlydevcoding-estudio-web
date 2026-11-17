import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { urlMedio } from "@/lib/api";
import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";
import {
  LIMITES_PUBLICACION,
  limiteTextoRed,
  longitudPublicacion,
} from "@/lib/limites";
import type { RedVista, TextosRed as TextosRedDatos } from "@/lib/tipos";

function Contador({ texto, limite }: { texto: string; limite: number }) {
  const longitud = longitudPublicacion(texto);
  return (
    <span
      className={`font-mono text-xs ${longitud > limite ? "text-red-400" : "text-tenue"}`}
    >
      {longitud}/{limite}
    </span>
  );
}

function CampoTexto({
  titulo,
  texto,
  limite,
}: {
  titulo: string;
  texto: string;
  limite: number;
}) {
  return (
    <section aria-label={titulo} className="border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-3 border-b border-borde px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <Contador texto={texto} limite={limite} />
        </div>
        <BotonCopiar texto={texto} />
      </div>
      <p className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-texto">
        {texto || "—"}
      </p>
    </section>
  );
}

export function TextosRed({
  red,
  textos,
  fechaPropuesta,
}: {
  red: RedVista["red"];
  textos: TextosRedDatos | null;
  fechaPropuesta: string | null;
}) {
  if (textos === null) {
    return (
      <div className="grid gap-5">
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

  return (
    <div className="grid gap-4">
      {red === "youtube" && textos.titulos.length > 0 ? (
        <section aria-labelledby="titulos-red" className="grid gap-3">
          <h3 id="titulos-red" className="text-sm font-semibold uppercase tracking-[0.14em] text-tenue">
            Títulos
          </h3>
          {textos.titulos.map((titulo, indice) => (
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
                  <p className="break-words text-sm leading-6">{titulo || "—"}</p>
                </div>
                <BotonCopiar texto={titulo} />
              </div>
              <div className="mt-3">
                <Contador
                  texto={titulo}
                  limite={LIMITES_PUBLICACION.tituloYoutube}
                />
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {red === "youtube" && textos.descripcion !== null ? (
        <CampoTexto
          titulo="Descripción"
          texto={textos.descripcion}
          limite={LIMITES_PUBLICACION.descripcionYoutube}
        />
      ) : null}

      {red === "youtube" && textos.etiquetas.length > 0 ? (
        <CampoTexto
          titulo="Etiquetas"
          texto={etiquetas}
          limite={LIMITES_PUBLICACION.etiquetasYoutube}
        />
      ) : null}

      {limiteTexto !== null && textos.texto !== null ? (
        <CampoTexto titulo="Texto" texto={textos.texto} limite={limiteTexto} />
      ) : null}

      {textos.comentario_fijado !== null ? (
        <CampoTexto
          titulo="Comentario fijado"
          texto={textos.comentario_fijado}
          limite={LIMITES_PUBLICACION.comentarioFijado}
        />
      ) : null}

      {textos.ajustes.length > 0 ? (
        <section className="border border-borde bg-superficie p-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold">Ajustes de Studio</h3>
            <span
              className={`font-mono text-xs ${textos.ajustes.length > LIMITES_PUBLICACION.maximoLineas ? "text-red-400" : "text-tenue"}`}
            >
              {textos.ajustes.length}/{LIMITES_PUBLICACION.maximoLineas} líneas
            </span>
          </div>
          <ul className="mt-3 grid gap-2 text-sm text-tenue">
            {textos.ajustes.map((ajuste, indice) => (
              <li key={`${indice}-${ajuste}`} className="flex gap-3">
                <span aria-hidden="true" className="text-marca">—</span>
                <span className="min-w-0 flex-1 break-words">{ajuste}</span>
                <Contador
                  texto={ajuste}
                  limite={LIMITES_PUBLICACION.caracteresPorLinea}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {textos.notas !== null ? (
        <CampoTexto
          titulo="Notas"
          texto={textos.notas}
          limite={LIMITES_PUBLICACION.notas}
        />
      ) : null}

      {textos.video ? (
        <section aria-labelledby="video-red-titulo">
          <h3 id="video-red-titulo" className="text-sm font-semibold">
            Vídeo de esta red
          </h3>
          <video
            src={urlMedio(textos.video)}
            controls
            preload="metadata"
            playsInline
            className="mt-3 aspect-video w-full border border-borde bg-carbon object-contain"
          />
        </section>
      ) : null}

      {fechaPropuesta ? (
        <p className="border-l-2 border-marca pl-3 text-sm text-tenue">
          Fecha propuesta: {fechaPublicacionLegible(fechaPropuesta)}
        </p>
      ) : null}
    </div>
  );
}

export { TextosRed as TextosPublicacionRed };
