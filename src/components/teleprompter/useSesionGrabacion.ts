"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { Microfono } from "@/components/teleprompter/BarraAjustes";
import {
  abrirMicro,
  aWav,
  grabar,
  medirNivel,
  subirToma,
  type Grabacion,
} from "@/lib/teleprompter/grabadora";
import { guardarPreferencias, leerPreferencias } from "@/lib/teleprompter/preferencias";
import type { TomaGuardada } from "@/lib/tipos";

export type Pendiente = { escena: string; wav: Blob };

export const mensaje = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Subida = { ok: true } | { ok: false; error: string };

// Tras reintentar varias tomas: cuántas se han subido y cuántas siguen pendientes.
export function resumenSubidas(subidas: number, total: number, ultimoError: string): string {
  const quedan = total - subidas;
  if (quedan === 0) return `Subidas las ${total} tomas pendientes.`;
  const pendientes = quedan === 1 ? "queda 1 pendiente" : `quedan ${quedan} pendientes`;
  return `Subidas: ${subidas} de ${total} tomas; ${pendientes}. Último error: ${ultimoError}`;
}

// Micrófono, grabadora y subidas: todo lo que pertenece al navegador vive fuera del estado de React.
type Vivo = {
  cerrado: boolean;
  grabacion: Grabacion | null;
  grabando: boolean;
  guardando: boolean;
  // Un solo flujo abierto y, como mucho, una apertura en curso que se reutiliza.
  flujo: MediaStream | null;
  microAbierto: string;
  abriendo: Promise<MediaStream> | null;
  microAbriendo: string;
  generacionMicro: number;
  contexto: AudioContext | null;
  pararNivel: (() => void) | null;
};

const crearVivo = (): Vivo => ({
  cerrado: false,
  grabacion: null,
  grabando: false,
  guardando: false,
  flujo: null,
  microAbierto: "",
  abriendo: null,
  microAbriendo: "",
  generacionMicro: 0,
  contexto: null,
  pararNivel: null,
});

const pararPistas = (flujo: MediaStream | null) =>
  flujo?.getTracks().forEach((pista) => pista.stop());

export function useSesionGrabacion({
  curso,
  numero,
  nivelRef,
  alEstado,
  alGuardar,
}: {
  curso: string;
  numero: number;
  nivelRef: RefObject<HTMLElement | null>;
  alEstado: (texto: string) => void;
  // Tras guardar una toma con la sesión abierta (para refrescar los datos de la página).
  alGuardar: () => void;
}) {
  const [tomas, setTomas] = useState<Record<string, TomaGuardada>>({});
  // Tomas convertidas a WAV cuya subida falló: se conservan para reintentar.
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [guardando, setGuardando] = useState(false);
  // Copia en estado de `vivo.grabando`, para avisar al salir de la página.
  const [grabando, setGrabando] = useState(false);
  const [micros, setMicros] = useState<Microfono[]>([]);
  const vivoRef = useRef<Vivo | null>(null);
  // Se crea la primera vez que hace falta, nunca durante el render.
  const vivo = (): Vivo => (vivoRef.current ??= crearVivo());

  // Salir de la página con una toma grabándose, sin subir o subiéndose la perdería: el navegador pregunta.
  const tomaSinSubir = grabando || pendientes.length > 0 || guardando;
  useEffect(() => {
    if (!tomaSinSubir) return;
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    window.addEventListener("beforeunload", alSalir);
    return () => window.removeEventListener("beforeunload", alSalir);
  }, [tomaSinSubir]);

  useEffect(() => {
    const v = vivo();
    v.cerrado = false;
    return () => {
      v.cerrado = true;
      v.generacionMicro++;
      v.pararNivel?.();
      v.pararNivel = null;
      v.grabacion = null;
      v.grabando = false;
      pararPistas(v.flujo);
      v.flujo = null;
      v.abriendo = null;
      v.contexto?.close().catch(() => undefined);
      v.contexto = null;
    };
  }, []);

  function pintarNivel(pico: number) {
    const caja = nivelRef.current;
    const barra = caja?.firstElementChild as HTMLElement | null | undefined;
    if (!caja || !barra) return;
    barra.style.width = `${Math.min(100, pico * 110)}%`;
    caja.classList.toggle("alto", pico > 0.95);
  }

  async function listarMicros() {
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      setMicros(
        dispositivos
          .filter(({ kind, deviceId }) => kind === "audioinput" && deviceId !== "default")
          .map(({ deviceId, label }) => ({ id: deviceId, nombre: label || "Micrófono" })),
      );
    } catch {
      // La lista de micrófonos es una ayuda: sin ella se graba con el predeterminado.
    }
  }

  // Devuelve el flujo del micrófono elegido. Nunca hay dos aperturas a la vez: la que está en
  // curso se reutiliza, y una apertura que llega tarde (sesión cerrada o micrófono cambiado)
  // cierra su flujo en vez de quedarse con él.
  function abrirMicroConNivel(): Promise<MediaStream> {
    const v = vivo();
    if (v.cerrado) return Promise.reject(new Error("El teleprompter se ha cerrado"));
    const micro = leerPreferencias().micro;
    if (v.flujo && v.microAbierto === micro) return Promise.resolve(v.flujo);
    if (v.abriendo && v.microAbriendo === micro) return v.abriendo;

    // Otro micrófono: lo abierto o lo que se estaba abriendo deja de valer.
    v.generacionMicro++;
    pararPistas(v.flujo);
    v.flujo = null;
    v.pararNivel?.();
    v.pararNivel = null;

    const generacion = v.generacionMicro;
    const apertura: Promise<MediaStream> = abrirMicro(micro).then(
      (flujo) => {
        if (v.abriendo === apertura) v.abriendo = null;
        if (v.cerrado) {
          pararPistas(flujo);
          throw new Error("El teleprompter se ha cerrado");
        }
        if (generacion !== v.generacionMicro) {
          pararPistas(flujo);
          return abrirMicroConNivel();
        }
        v.flujo = flujo;
        v.microAbierto = micro;
        v.contexto ??= new AudioContext();
        v.pararNivel = medirNivel(v.contexto, flujo, pintarNivel);
        void listarMicros();
        return flujo;
      },
      (error: unknown) => {
        if (v.abriendo === apertura) v.abriendo = null;
        throw error;
      },
    );
    v.abriendo = apertura;
    v.microAbriendo = micro;
    return apertura;
  }

  // Solo la ejecución viva crea la grabadora, sobre el flujo que acaba de recibir.
  function empezarGrabacion(flujo: MediaStream) {
    const v = vivo();
    v.grabacion = grabar(flujo);
    v.grabando = true;
    setGrabando(true);
  }

  async function subir(wav: Blob, idEscena: string): Promise<Subida> {
    const v = vivo();
    alEstado("Guardando…");
    try {
      const toma = await subirToma(curso, numero, idEscena, wav);
      setPendientes((actuales) => actuales.filter((p) => p.escena !== idEscena));
      setTomas((anteriores) => ({ ...anteriores, [idEscena]: toma }));
      alEstado(`Guardada: ${idEscena}.wav. Escúchala o pasa a la siguiente con →.`);
      if (!v.cerrado) alGuardar();
      return { ok: true };
    } catch (error) {
      setPendientes((actuales) => [
        ...actuales.filter((p) => p.escena !== idEscena),
        { escena: idEscena, wav },
      ]);
      alEstado(`No se pudo guardar: ${mensaje(error)}`);
      return { ok: false, error: mensaje(error) };
    }
  }

  async function pararGrabacion(idEscena: string, tirar = false) {
    const v = vivo();
    const grabacion = v.grabacion;
    if (!grabacion) return;
    v.grabacion = null;
    v.guardando = true;
    setGuardando(true);
    try {
      const audio = await grabacion.parar();
      v.grabando = false;
      setGrabando(false);
      if (tirar) {
        alEstado("Toma descartada.");
        return;
      }
      alEstado("Guardando…");
      // Si la sesión se cerró mientras tanto, se decodifica con un contexto propio que se cierra al acabar.
      const contexto = !v.cerrado && v.contexto ? v.contexto : new AudioContext();
      let wav: Blob;
      try {
        wav = await aWav(audio, contexto);
      } finally {
        if (contexto !== v.contexto) contexto.close().catch(() => undefined);
      }
      await subir(wav, idEscena);
    } catch (error) {
      alEstado(`No se pudo guardar: ${mensaje(error)}`);
    } finally {
      v.grabando = false;
      setGrabando(false);
      v.guardando = false;
      setGuardando(false);
    }
  }

  async function reintentar() {
    const v = vivo();
    if (v.guardando || pendientes.length === 0) return;
    v.guardando = true;
    setGuardando(true);
    try {
      let subidas = 0;
      let ultimoError = "";
      for (const { escena: idEscena, wav } of pendientes) {
        const resultado = await subir(wav, idEscena);
        if (resultado.ok) subidas++;
        else ultimoError = resultado.error;
      }
      if (pendientes.length > 1) alEstado(resumenSubidas(subidas, pendientes.length, ultimoError));
    } finally {
      v.guardando = false;
      setGuardando(false);
    }
  }

  async function cambiarMicro(micro: string) {
    const v = vivo();
    guardarPreferencias({ micro });
    // Grabando, se aplica en la siguiente toma para no cortarla; sin micrófono abierto, al abrirlo.
    if (v.grabando || (!v.flujo && !v.abriendo)) return;
    try {
      await abrirMicroConNivel();
    } catch (error) {
      if (!v.cerrado) alEstado(`No se puede usar el micrófono: ${mensaje(error)}`);
    }
  }

  return {
    tomas,
    pendientes,
    guardando,
    micros,
    abrirMicroConNivel,
    empezarGrabacion,
    pararGrabacion,
    reintentar,
    cambiarMicro,
    grabandoAhora: () => vivo().grabando,
    guardandoAhora: () => vivo().guardando,
    abriendoAhora: () => vivo().abriendo !== null,
    cerrada: () => vivo().cerrado,
  };
}
