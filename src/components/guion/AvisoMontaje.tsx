"use client";

import { BotonAccion, textoEstadoTrabajo } from "@/components/acciones/BotonAccion";
import type { EstadoAccion, EstadoMontaje, IdAccion, Trabajo } from "@/lib/tipos";

const ACCIONES_DEL_AVISO: readonly IdAccion[] = ["alinear-voz", "preparar-montaje"];

export type Aviso = {
  texto: string;
  alDia: boolean;
  accion: EstadoAccion | null;
  // Lo lanzado antes desde el aviso, si ya no es la acción que se enseña (p. ej. la voz alineada
  // cuando ahora toca preparar el montaje).
  anterior: { etiqueta: string; trabajo: Trabajo } | null;
};

// Qué enseña el aviso. Por orden:
// 1. Un trabajo del montaje en marcha: se sigue enseñando aunque un refresco cambie el estado,
//    para no perder su progreso ni «Cancelar».
// 2. La acción que pide el estado del montaje.
// 3. Con el montaje al día, lo lanzado desde aquí en esta visita, para ver su «Hecho».
export function elegirAviso(
  montaje: EstadoMontaje | null,
  acciones: EstadoAccion[] | null,
  lanzada: IdAccion | null,
): Aviso | null {
  if (!montaje) return null;

  const buscar = (id: IdAccion | null) =>
    id ? acciones?.find((accion) => accion.id === id) ?? null : null;
  const enMarcha =
    acciones?.find(
      (accion) =>
        ACCIONES_DEL_AVISO.includes(accion.id) && accion.ultimo?.estado === "en_marcha",
    ) ?? null;
  const requerida: IdAccion | null =
    montaje.estado === "voz_sin_alinear"
      ? "alinear-voz"
      : montaje.estado === "al_dia"
        ? null
        : "preparar-montaje";

  if (montaje.estado === "al_dia" && !enMarcha && !lanzada) return null;

  const accion = enMarcha ?? buscar(requerida) ?? buscar(lanzada);
  const delAviso = buscar(lanzada);
  const anterior =
    delAviso &&
    delAviso.id !== accion?.id &&
    delAviso.ultimo &&
    delAviso.ultimo.estado !== "en_marcha"
      ? { etiqueta: delAviso.etiqueta, trabajo: delAviso.ultimo }
      : null;

  const texto =
    montaje.estado === "voz_sin_alinear"
      ? `Voz sin alinear: ${montaje.sin_alinear.join(", ")}.`
      : montaje.estado === "guion_cambiado"
        ? "Guion cambiado: hay que regenerar el montaje."
        : montaje.estado === "sin_montaje"
          ? "Esta lección aún no tiene montaje."
          : "Montaje al día.";

  return { texto, alDia: montaje.estado === "al_dia", accion, anterior };
}

export function AvisoMontaje({
  curso,
  numero,
  montaje,
  acciones,
  lanzada = null,
  alLanzar,
  alCambiarTrabajo,
}: {
  curso: string;
  numero: number;
  montaje: EstadoMontaje | null;
  acciones: EstadoAccion[] | null;
  lanzada?: IdAccion | null;
  alLanzar?: (accion: IdAccion, trabajo: Trabajo) => void;
  alCambiarTrabajo?: (accion: IdAccion, trabajo: Trabajo | null) => void;
}) {
  const aviso = elegirAviso(montaje, acciones, lanzada);
  if (!aviso) return null;
  const { accion } = aviso;

  return (
    <aside
      className={`border bg-superficie p-5 ${aviso.alDia ? "border-verde" : "border-ambar"}`}
      aria-label="Estado del montaje"
    >
      <p className={`font-medium ${aviso.alDia ? "text-verde" : "text-ambar"}`}>{aviso.texto}</p>
      {aviso.anterior ? (
        <p className="mt-2 text-sm text-tenue">
          {`${aviso.anterior.etiqueta}: ${textoEstadoTrabajo(aviso.anterior.trabajo)}`}
        </p>
      ) : null}
      {accion ? (
        <div className="mt-4">
          {/* La key evita que el botón arrastre el trabajo o el mensaje de otra acción. */}
          <BotonAccion
            key={accion.id}
            curso={curso}
            numero={numero}
            accion={accion}
            ocultarAnterior
            alLanzar={(trabajo) => alLanzar?.(accion.id, trabajo)}
            alCambiarTrabajo={(trabajo) => alCambiarTrabajo?.(accion.id, trabajo)}
          />
        </div>
      ) : null}
    </aside>
  );
}
