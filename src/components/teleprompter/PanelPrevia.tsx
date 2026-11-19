"use client";

import type { Ref } from "react";

import type { SeguimientoPrevia } from "@/components/teleprompter/useSeguimientoPrevia";
import { textoErrorTrabajo } from "@/lib/error-trabajo";
import { urlToma } from "@/lib/medios";
import type { EstadoPrevia, Montaje, Trabajo } from "@/lib/tipos";

const BOTON =
  "inline-flex cursor-pointer items-center justify-self-center rounded-[10px] border border-marca bg-marca px-4 py-2.5 font-semibold text-white transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-40";

// El error de un trabajo pasa por el filtro común (`textoErrorTrabajo`): el teleprompter sale en
// capturas y vídeos y nunca debe enseñar una ruta del disco.
function textoFallo(
  error: string | null,
  estado: "error" | "interrumpido" | "cancelado",
): string {
  const motivo =
    estado === "cancelado"
      ? "se canceló"
      : textoErrorTrabajo(error) ??
        (estado === "interrumpido" && error === null ? "se interrumpió" : null);
  return motivo ? `Falló la última vez (${motivo}).` : "Falló la última vez.";
}

function falloDe(trabajo: Trabajo | null): string | null {
  if (
    trabajo?.estado !== "error" &&
    trabajo?.estado !== "interrumpido" &&
    trabajo?.estado !== "cancelado"
  ) {
    return null;
  }
  return textoFallo(trabajo.error, trabajo.estado);
}

function ContenidoSinVideo({
  montaje,
  generando,
  perdida,
  porcentaje,
  fallo,
  pidiendo,
  mensaje,
  generar,
}: {
  montaje: Montaje | null;
  generando: boolean;
  perdida: boolean;
  porcentaje: number;
  fallo: string | null;
  pidiendo: boolean;
  mensaje: string | null;
  generar: () => void;
}) {
  if (!montaje) return "Esta lección aún no tiene montaje.";
  if (generando) {
    return (
      <>
        <span>
          Generando la vista previa… <span>{`${porcentaje} %`}</span>
        </span>
        <span
          role="progressbar"
          aria-label="Avance de la vista previa"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          className="block h-1.5 overflow-hidden rounded-[3px] bg-borde"
        >
          <i
            className="block h-full bg-marca"
            style={{ width: `${porcentaje}%` }}
          />
        </span>
      </>
    );
  }
  if (perdida) {
    return (
      <>
        <span>La vista previa no se ha encontrado al terminar.</span>
        <button type="button" onClick={generar} disabled={pidiendo} className={BOTON}>
          Regenerar
        </button>
        {mensaje ? <span role="alert" className="text-ambar">{mensaje}</span> : null}
      </>
    );
  }
  return (
    <>
      <span>
        {fallo ? (
          <>
            {fallo}
            <br />
          </>
        ) : null}
        La vista previa tarda unos minutos y se hace una sola vez por lección.
      </span>
      <button type="button" onClick={generar} disabled={pidiendo} className={BOTON}>
        Generar vista previa
      </button>
      {mensaje ? <span role="alert" className="text-ambar">{mensaje}</span> : null}
    </>
  );
}

function EstadoMontaje({
  desactualizada,
  hay,
  pidiendo,
  generar,
}: {
  desactualizada: boolean;
  hay: boolean;
  pidiendo: boolean;
  generar: () => void;
}) {
  if (desactualizada) {
    return (
      <>
        <span>el montaje ha cambiado: regénerala</span>
        {hay ? (
          <button
            type="button"
            onClick={generar}
            disabled={pidiendo}
            className="cursor-pointer rounded-md border border-borde bg-fondo px-2 py-0.5 text-xs font-semibold text-texto hover:enabled:border-tenue disabled:opacity-40"
          >
            Regenerar
          </button>
        ) : null}
      </>
    );
  }
  return hay ? "voz provisional, sin sonido" : null;
}

// Solo pinta: el seguimiento del trabajo vive en la sesión (`useSeguimientoPrevia`), así que
// sigue aunque el panel se oculte.
export function PanelPrevia({
  previa,
  montaje,
  escena,
  seguimiento,
  videoRef,
  alCargarVideo,
}: {
  previa: EstadoPrevia;
  montaje: Montaje | null;
  escena: string;
  seguimiento: SeguimientoPrevia;
  videoRef?: Ref<HTMLVideoElement>;
  alCargarVideo?: () => void;
}) {
  const { trabajo, generando, perdida, pidiendo, mensaje, generar } = seguimiento;
  const escenaMontaje = montaje?.escenas.find(({ id }) => id === escena);
  const hay = Boolean(previa.existe && previa.ruta && escenaMontaje) && !generando && !perdida;
  const fallo = falloDe(trabajo);
  const fuente = previa.ruta === null ? null : urlToma(previa.ruta, previa.version);
  const porcentaje = Math.round((trabajo?.progreso ?? 0) * 100);

  return (
    <aside
      aria-label="Vista previa de la escena"
      className="z-[2] mx-4 mt-3.5 overflow-hidden rounded-xl border border-borde bg-superficie shadow-[0_12px_32px_rgba(0,0,0,0.45)] md:absolute md:top-4 md:right-6 md:mx-0 md:mt-0 md:w-(--ancho-previa)"
    >
      {hay && fuente ? (
        <video
          ref={videoRef}
          src={fuente}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={alCargarVideo}
          className="block aspect-video w-full bg-black"
        />
      ) : (
        <div className="grid aspect-video place-content-center gap-2.5 p-4 text-center text-sm text-tenue">
          <ContenidoSinVideo
            montaje={montaje}
            generando={generando}
            perdida={perdida}
            porcentaje={porcentaje}
            fallo={fallo}
            pidiendo={pidiendo}
            mensaje={mensaje}
            generar={generar}
          />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-tenue">
        <span>
          <b className="font-mono text-texto">{escena}</b>
          {" · "}
          <span>{hay ? "lo que sale en pantalla" : "sin vista previa"}</span>
        </span>
        <span className="flex items-center gap-2 text-right">
          <EstadoMontaje
            desactualizada={previa.desactualizada}
            hay={hay}
            pidiendo={pidiendo}
            generar={generar}
          />
        </span>
      </div>
      {hay && mensaje ? (
        <p role="alert" className="m-0 px-2.5 pb-1.5 text-xs text-ambar">
          {mensaje}
        </p>
      ) : null}
    </aside>
  );
}
