import { urlMedio } from "@/lib/api";
import type { Escena } from "@/lib/tipos";

const ETIQUETAS_MODO: Record<Escena["modo"], string> = {
  camara: "cámara",
  voz: "voz en off",
  animacion: "animación",
};

function extractoTextos(textos: string[]): string {
  const texto = textos.join(" ").trim();

  if (texto.length <= 180) {
    return texto;
  }

  return `${texto.slice(0, 177).trimEnd()}...`;
}

export function TarjetaEscena({
  escena,
  previa,
}: {
  escena: Escena;
  previa: string | null;
}) {
  const fuenteFotograma =
    previa !== null && escena.inicio_s !== null
      ? `${urlMedio(previa)}#t=${escena.inicio_s + 1}`
      : null;
  const extracto = extractoTextos(escena.textos);

  return (
    <article className="grid overflow-hidden border border-borde bg-superficie md:grid-cols-[15rem_1fr]">
      <div className="aspect-video min-h-36 bg-carbon md:aspect-auto">
        {fuenteFotograma ? (
          <video
            className="h-full w-full object-cover"
            src={fuenteFotograma}
            preload="metadata"
            muted
            playsInline
            aria-label={`Fotograma de ${escena.id}`}
          />
        ) : (
          <div className="flex h-full min-h-36 items-center justify-center p-5 font-mono text-sm text-tenue">
            {escena.id}
          </div>
        )}
      </div>

      <div className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs text-tenue">{escena.id}</span>
          <span className="border border-borde bg-carbon px-2 py-1 text-xs font-medium text-texto">
            {ETIQUETAS_MODO[escena.modo]}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
          {escena.titulo}
        </h3>
        {extracto ? (
          <p className="mt-2 max-w-[68ch] text-sm leading-6 text-tenue">
            {extracto}
          </p>
        ) : (
          <p className="mt-2 text-sm text-tenue">Esta escena no tiene texto.</p>
        )}
      </div>
    </article>
  );
}
