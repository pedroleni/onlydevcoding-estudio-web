"use client";

import { useState } from "react";

import { BotonAccion } from "@/components/acciones/BotonAccion";
import type { EstadoAccion } from "@/lib/tipos";

const NOMBRE_PREVIA = /(?:^|\/)previa-v(\d+)\.mp4$/;

function siguientePrevia(previas: string[]): number {
  return (
    previas.reduce((mayor, previa) => {
      const coincidencia = previa.match(NOMBRE_PREVIA);
      return coincidencia ? Math.max(mayor, Number(coincidencia[1])) : mayor;
    }, 0) + 1
  );
}

export function PanelVideoFinal({
  curso,
  numero,
  previas,
  acciones,
}: {
  curso: string;
  numero: number;
  previas: string[];
  acciones: EstadoAccion[] | null;
}) {
  const renderizar = acciones?.find(({ id }) => id === "render-leccion");
  const videoFinal = acciones?.find(({ id }) => id === "video-final");
  const [previaElegida, setPreviaElegida] = useState<string | null>(null);
  const previaValida = previaElegida && videoFinal?.opciones.includes(previaElegida)
    ? previaElegida
    : videoFinal?.opciones.at(-1) ?? "";
  const numeroPrevia = siguientePrevia(previas);

  if (!renderizar && !videoFinal) return null;

  const videoFinalDisponible = (videoFinal?.opciones.length ?? 0) > 0;
  const accionVideoFinal = videoFinal
    ? {
        ...videoFinal,
        disponible: videoFinal.disponible && videoFinalDisponible,
        motivo: videoFinalDisponible
          ? videoFinal.motivo
          : videoFinal.motivo ?? "No hay ninguna previa disponible",
      }
    : null;

  return (
    <section
      className="grid gap-5 border border-borde bg-superficie p-5"
      aria-labelledby="acciones-video-final"
    >
      <h2 id="acciones-video-final" className="text-xl font-semibold">
        Acciones de vídeo
      </h2>

      {renderizar ? (
        <BotonAccion
          curso={curso}
          numero={numero}
          accion={renderizar}
          textoBoton={`Renderizar una versión nueva (previa-v${numeroPrevia})`}
          confirmar={`Se renderizará previa-v${numeroPrevia} con el montaje actual. Puede tardar bastante. ¿Seguimos?`}
        />
      ) : null}

      {accionVideoFinal ? (
        <div className="grid justify-items-start gap-3 border-t border-borde pt-5">
          {videoFinalDisponible ? (
            <label className="grid gap-2 text-sm font-medium text-texto">
              Previa para el vídeo final
              <select
                className="min-h-11 border border-borde bg-carbon px-3 text-sm text-texto"
                value={previaValida}
                onChange={(evento) => setPreviaElegida(evento.target.value)}
              >
                {accionVideoFinal.opciones.map((previa) => (
                  <option key={previa} value={previa}>
                    {previa}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <BotonAccion
            curso={curso}
            numero={numero}
            accion={accionVideoFinal}
            opciones={previaValida ? { previa: previaValida } : {}}
            confirmar={
              previaValida
                ? `Se creará el vídeo final a −14 LUFS desde ${previaValida}. Si ya hay un vídeo final, se guardará en anteriores/. ¿Seguimos?`
                : undefined
            }
          />
        </div>
      ) : null}
    </section>
  );
}
