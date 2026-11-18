"use client";

import { useMemo, useState } from "react";

import { BotonAccion } from "@/components/acciones/BotonAccion";
import { etiquetaPrevia, numeroPrevia, previaPorDefecto } from "@/lib/numero-previa";
import type { EstadoAccion } from "@/lib/tipos";

function siguientePrevia(previas: string[]): number {
  return (
    previas.reduce((mayor, previa) => Math.max(mayor, numeroPrevia(previa) ?? 0), 0) + 1
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
    : previaPorDefecto(videoFinal?.opciones ?? []) ?? "";
  const siguiente = siguientePrevia(previas);
  const videoFinalDisponible = (videoFinal?.opciones.length ?? 0) > 0;
  // La acción derivada solo cambia con datos nuevos: BotonAccion borra su mensaje cuando cambia.
  const accionVideoFinal = useMemo(
    () =>
      videoFinal
        ? {
            ...videoFinal,
            disponible: videoFinal.disponible && videoFinalDisponible,
            motivo: videoFinalDisponible
              ? videoFinal.motivo
              : videoFinal.motivo ?? "No hay ninguna previa disponible",
          }
        : null,
    [videoFinal, videoFinalDisponible],
  );

  if (!renderizar && !videoFinal) return null;

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
          textoBoton={`Renderizar una versión nueva (previa-v${siguiente})`}
          confirmar={`Se renderizará previa-v${siguiente} con el montaje actual. Puede tardar bastante. ¿Seguimos?`}
        />
      ) : null}

      {accionVideoFinal ? (
        <div className="grid justify-items-start gap-3 border-t border-borde pt-5">
          {videoFinalDisponible ? (
            <label className="grid max-w-full min-w-0 gap-2 text-sm font-medium text-texto">
              Previa para el vídeo final
              <select
                className="min-h-11 w-full max-w-full border border-borde bg-carbon px-3 text-sm text-texto"
                value={previaValida}
                onChange={(evento) => setPreviaElegida(evento.target.value)}
              >
                {accionVideoFinal.opciones.map((previa, indice) => (
                  <option key={`${previa}-${indice}`} value={previa}>
                    {etiquetaPrevia(previa) ?? previa}
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
