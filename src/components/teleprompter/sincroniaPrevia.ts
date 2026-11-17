import { objetivoLectura, objetivoToma, type EscenaMontaje } from "@/lib/teleprompter/previa";
import type { Plan } from "@/lib/teleprompter/ritmo";

// La vista previa es la lección montada, en pequeño y sin sonido. Estas funciones mueven el
// <video> directamente (sin pasar por el estado de React), igual que la animación del texto.

// Al cambiar de escena o al cargar el vídeo: parado al inicio de la escena.
export function colocarVideo(
  video: HTMLVideoElement | null,
  escenaMontaje: EscenaMontaje | undefined,
  fps: number,
) {
  if (!video || !escenaMontaje) return;
  video.pause();
  video.currentTime = escenaMontaje.inicio / fps + 0.05;
}

function seguir(video: HTMLVideoElement, tiempo: number, ritmo: number, margen: number) {
  if (Math.abs(video.playbackRate - ritmo) > 0.02) video.playbackRate = ritmo;
  if (Math.abs(video.currentTime - tiempo) > margen) video.currentTime = tiempo;
}

// Inicio de cada frase en el plan del teleprompter.
export const iniciosDeFrases = (plan: Plan, frases: number) =>
  Array.from({ length: frases }, (_, c) => plan.pasos.find((paso) => paso.c === c)?.desde ?? 0);

// Mientras se lee: cada frase del teleprompter se empareja con la misma frase del montaje.
export function seguirLectura(
  video: HTMLVideoElement | null,
  parametros: Parameters<typeof objetivoLectura>[0],
) {
  if (!video || video.readyState < 1) return;
  const objetivo = objetivoLectura(parametros);
  if (objetivo.pausar) {
    if (!video.paused) video.pause();
    return;
  }
  seguir(video, objetivo.tiempo, objetivo.ritmo, 0.3);
  if (video.paused) video.play().catch(() => undefined);
}

// Al escuchar una toma: la escena entera se estira o se encoge a la duración de la toma.
export function seguirToma(
  video: HTMLVideoElement | null,
  audio: HTMLAudioElement,
  escenaMontaje: EscenaMontaje,
  fps: number,
) {
  if (!video || video.readyState < 1) return;
  const objetivo = objetivoToma({
    tiempoToma: audio.currentTime,
    duracionToma: audio.duration,
    escenaMontaje,
    fps,
  });
  if (!objetivo) return;
  seguir(video, objetivo.tiempo, objetivo.ritmo, 0.25);
  if (audio.paused) video.pause();
  else if (video.paused) video.play().catch(() => undefined);
}
