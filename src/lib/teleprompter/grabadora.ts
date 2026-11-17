import { codificarWav } from "@/lib/teleprompter/wav";
import type { TomaGuardada } from "@/lib/tipos";

const TIPOS = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"] as const;

// Sin procesado del navegador: la voz se limpia después, en el montaje.
export function abrirMicro(deviceId: string): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
    },
  });
}

export type Grabacion = { parar: () => Promise<Blob> };

export function grabar(flujo: MediaStream): Grabacion {
  const tipo = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
  const grabadora = new MediaRecorder(
    flujo,
    tipo ? { mimeType: tipo, audioBitsPerSecond: 256000 } : undefined,
  );
  const trozos: Blob[] = [];
  const reunir = () => new Blob(trozos, { type: grabadora.mimeType || tipo || "" });

  grabadora.ondataavailable = (evento) => {
    if (evento.data.size) trozos.push(evento.data);
  };
  grabadora.start(250);

  return {
    parar: () =>
      new Promise<Blob>((resolve) => {
        if (grabadora.state === "inactive") return resolve(reunir());
        grabadora.onstop = () => resolve(reunir());
        grabadora.stop();
      }),
  };
}

// Pico del micrófono en cada fotograma (0 a 1). Devuelve la función que deja de medir.
export function medirNivel(
  contexto: AudioContext,
  flujo: MediaStream,
  alMedir: (pico: number) => void,
): () => void {
  const analizador = contexto.createAnalyser();
  analizador.fftSize = 1024;
  contexto.createMediaStreamSource(flujo).connect(analizador);
  const datos = new Float32Array(analizador.fftSize);
  let fotograma = 0;
  const paso = () => {
    analizador.getFloatTimeDomainData(datos);
    let pico = 0;
    for (const valor of datos) pico = Math.max(pico, Math.abs(valor));
    alMedir(pico);
    fotograma = requestAnimationFrame(paso);
  };
  paso();
  return () => cancelAnimationFrame(fotograma);
}

// Convierte lo grabado a WAV (mono, 16 bits) para que el montaje lo lea igual que siempre.
export async function aWav(blob: Blob, contexto: BaseAudioContext): Promise<Blob> {
  const audio = await contexto.decodeAudioData(await blob.arrayBuffer());
  const canales = Array.from({ length: audio.numberOfChannels }, (_, c) =>
    audio.getChannelData(c),
  );
  return new Blob([codificarWav(canales, audio.sampleRate)], { type: "audio/wav" });
}

// Una subida que no acaba en este tiempo se corta y cuenta como fallida (se puede reintentar).
export const LIMITE_SUBIDA_MS = 120_000;

export async function subirToma(
  curso: string,
  numero: number,
  escena: string,
  wav: Blob,
): Promise<TomaGuardada> {
  const control = new AbortController();
  const limite = setTimeout(() => control.abort(), LIMITE_SUBIDA_MS);
  let respuesta: Response;
  let datos: unknown;
  try {
    respuesta = await fetch(
      `/grabar/${encodeURIComponent(curso)}/${numero}/${encodeURIComponent(escena)}`,
      {
        method: "PUT",
        body: wav,
        headers: { "Content-Type": "audio/wav" },
        signal: control.signal,
      },
    );
    datos = await respuesta.json().catch(() => null);
    // Si se cortó mientras se leía la respuesta, tampoco vale.
    control.signal.throwIfAborted();
  } catch (error) {
    if (control.signal.aborted) {
      throw new Error("La subida ha tardado más de 2 minutos y se ha cortado");
    }
    throw error;
  } finally {
    clearTimeout(limite);
  }

  if (!respuesta.ok) {
    const detalle =
      typeof datos === "object" && datos !== null && "detail" in datos
        ? (datos as { detail: unknown }).detail
        : null;
    throw new Error(typeof detalle === "string" && detalle ? detalle : `Error ${respuesta.status}`);
  }

  return datos as TomaGuardada;
}
