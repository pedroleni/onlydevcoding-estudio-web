"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState, useTransition, type Ref } from "react";

import { generarPreviaGrabacion } from "@/lib/acciones-teleprompter";
import { urlMedio } from "@/lib/medios";
import type { EstadoPrevia, Montaje, Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const CONSULTA_MS = 2000;

const BOTON =
  "inline-flex cursor-pointer items-center justify-self-center rounded-[10px] border border-marca bg-marca px-4 py-2.5 font-semibold text-white transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-40";

// Consulta el trabajo cada 2 s mientras está en marcha y la página se ve. Para al desmontar.
function useSeguirTrabajo(
  id: number | null,
  alLeer: (trabajo: Trabajo) => void,
) {
  const avisar = useEffectEvent(alLeer);

  useEffect(() => {
    if (id === null) return;
    let vivo = true;
    let consultando = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const programar = () => {
      clearTimeout(temporizador);
      temporizador = undefined;
      if (vivo && !consultando && document.visibilityState === "visible") {
        temporizador = setTimeout(consultar, CONSULTA_MS);
      }
    };

    async function consultar() {
      temporizador = undefined;
      if (document.visibilityState !== "visible") return;
      consultando = true;
      let trabajo: Trabajo | null = null;
      try {
        trabajo = await leerTrabajo(id as number);
      } catch {
        // Un fallo suelto de la API no detiene el seguimiento: se vuelve a probar.
      }
      consultando = false;
      if (!vivo) return;
      if (trabajo) avisar(trabajo);
      if (!trabajo || trabajo.estado === "en_marcha") programar();
    }

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") programar();
      else {
        clearTimeout(temporizador);
        temporizador = undefined;
      }
    };

    programar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [id]);
}

export function PanelPrevia({
  curso,
  numero,
  previa,
  montaje,
  escena,
  videoRef,
  alCargarVideo,
}: {
  curso: string;
  numero: number;
  previa: EstadoPrevia;
  montaje: Montaje | null;
  escena: string;
  videoRef?: Ref<HTMLVideoElement>;
  alCargarVideo?: () => void;
}) {
  const router = useRouter();
  // El trabajo que se sigue desde aquí; al llegar datos nuevos de la página manda el suyo.
  const [seguido, setSeguido] = useState<Trabajo | null>(null);
  const [previaAnterior, setPreviaAnterior] = useState(previa);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pidiendo, iniciar] = useTransition();
  if (previa !== previaAnterior) {
    setPreviaAnterior(previa);
    setSeguido(null);
  }

  const trabajo = seguido ?? previa.trabajo;
  // Hecho, pero aún sin los datos nuevos de la página: se sigue enseñando el avance completo.
  const generando =
    trabajo?.estado === "en_marcha" || (seguido !== null && seguido.estado === "hecho");
  const escenaMontaje = montaje?.escenas.find(({ id }) => id === escena);
  const hay = Boolean(previa.existe && previa.ruta && escenaMontaje) && !generando;
  const fallo =
    trabajo && (trabajo.estado === "error" || trabajo.estado === "interrumpido")
      ? (trabajo.error ?? "se interrumpió")
      : null;

  useSeguirTrabajo(trabajo?.estado === "en_marcha" ? trabajo.id : null, (leido) => {
    setSeguido(leido);
    if (leido.estado === "hecho") router.refresh();
  });

  function generar() {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await generarPreviaGrabacion(curso, numero);
      if (resultado.ok) setSeguido(resultado.trabajo);
      else setMensaje(resultado.mensaje);
    });
  }

  const fuente =
    previa.ruta === null
      ? null
      : `${urlMedio(previa.ruta)}${
          previa.version !== null ? `&v=${encodeURIComponent(String(previa.version))}` : ""
        }`;
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
          {!montaje ? (
            "Esta lección aún no tiene montaje."
          ) : generando ? (
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
          ) : (
            <>
              <span>
                {fallo ? (
                  <>
                    {`Falló la última vez (${fallo}).`}
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
          )}
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs text-tenue">
        <span>
          <b className="font-mono text-texto">{escena}</b>
          {" · "}
          <span>{hay ? "lo que sale en pantalla" : "sin vista previa"}</span>
        </span>
        <span className="flex items-center gap-2 text-right">
          {previa.desactualizada ? (
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
          ) : hay ? (
            "voz provisional, sin sonido"
          ) : null}
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
