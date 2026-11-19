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

function completarAccionVideoFinal(
  accion: EstadoAccion | undefined,
  disponible: boolean,
): EstadoAccion | null {
  if (!accion) return null;
  return {
    ...accion,
    disponible: accion.disponible && disponible,
    motivo: disponible
      ? accion.motivo
      : accion.motivo ?? "No hay ninguna previa disponible",
  };
}

function AccionRenderizar({
  accion,
  curso,
  numero,
  siguiente,
}: {
  accion: EstadoAccion | undefined;
  curso: string;
  numero: number;
  siguiente: number;
}) {
  if (!accion) return null;
  return (
    <BotonAccion
      curso={curso}
      numero={numero}
      accion={accion}
      textoBoton={`Renderizar una versión nueva (previa-v${siguiente})`}
      confirmar={`Se renderizará previa-v${siguiente} con el montaje actual. Puede tardar bastante. ¿Seguimos?`}
    />
  );
}

function AccionVideoFinal({
  accion,
  curso,
  numero,
  previa,
  disponible,
  alElegir,
}: {
  accion: EstadoAccion | null;
  curso: string;
  numero: number;
  previa: string;
  disponible: boolean;
  alElegir: (previa: string) => void;
}) {
  if (!accion) return null;
  return (
    <div className="grid justify-items-start gap-3 border-t border-borde pt-5">
      {disponible ? (
        <label className="grid max-w-full min-w-0 gap-2 text-sm font-medium text-texto">
          Previa para el vídeo final
          <select
            className="min-h-11 w-full max-w-full border border-borde bg-carbon px-3 text-sm text-texto"
            value={previa}
            onChange={(evento) => alElegir(evento.target.value)}
          >
            {accion.opciones.map((opcion, indice) => (
              <option key={`${opcion}-${indice}`} value={opcion}>
                {etiquetaPrevia(opcion) ?? opcion}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <BotonAccion
        curso={curso}
        numero={numero}
        accion={accion}
        opciones={previa ? { previa } : {}}
        confirmar={
          previa
            ? `Se creará el vídeo final a −14 LUFS desde ${previa}. Si ya hay un vídeo final, se guardará en anteriores/. ¿Seguimos?`
            : undefined
        }
      />
    </div>
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
    () => completarAccionVideoFinal(videoFinal, videoFinalDisponible),
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

      <AccionRenderizar
        accion={renderizar}
        curso={curso}
        numero={numero}
        siguiente={siguiente}
      />

      <AccionVideoFinal
        accion={accionVideoFinal}
        curso={curso}
        numero={numero}
        previa={previaValida}
        disponible={videoFinalDisponible}
        alElegir={setPreviaElegida}
      />
    </section>
  );
}
