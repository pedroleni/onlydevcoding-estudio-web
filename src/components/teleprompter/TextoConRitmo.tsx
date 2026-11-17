import { Fragment, memo } from "react";

import { trocear } from "@/lib/teleprompter/trocear";
import type { EscenaTeleprompter } from "@/lib/tipos";

// Palabra a palabra para el teleprompter. Las clases `dicha` y `ahora` las pone la animación
// directamente en el DOM (por refs), así que React no vuelve a pintar este bloque mientras lees.
export const CLASE_PALABRA =
  "p rounded-md text-[#c9cad1] transition-colors duration-[120ms] motion-reduce:transition-none [&.dicha]:text-[#5e5f68] [&.ahora]:bg-marca/35 [&.ahora]:text-white [&.ahora]:shadow-[0_0_0_4px_rgb(41_155_198/0.35)]";

export const TextoConRitmo = memo(function TextoConRitmo({
  cues,
}: {
  cues: EscenaTeleprompter["cues"];
}) {
  return cues.map((cue, c) => (
    <Fragment key={c}>
      <p
        data-c={c}
        className="mx-auto mb-[1.1em] max-w-[30ch] text-(length:--letra) leading-[1.45] font-semibold tracking-[-0.01em]"
      >
        {trocear(cue.texto).map((trozo, p) => (
          <Fragment key={p}>
            {p > 0 ? " " : null}
            <span className={CLASE_PALABRA} data-c={c} data-p={p}>
              {trozo.t}
            </span>
          </Fragment>
        ))}
      </p>
      {(cue.pausa ?? 0) >= 1 ? (
        <div
          data-pausa={c}
          className="mx-auto -mt-[0.4em] mb-[1.4em] flex max-w-[30ch] items-center gap-3 text-[22px] text-ambar"
        >
          ⏸ Pausa para pensar: sigue en silencio{" "}
          <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-borde">
            <i className="block h-full w-0 bg-ambar" />
          </span>
        </div>
      ) : null}
    </Fragment>
  ));
});
