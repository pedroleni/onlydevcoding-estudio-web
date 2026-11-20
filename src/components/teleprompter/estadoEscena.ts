import { urlToma } from "@/lib/medios";
import type { Preferencias } from "@/lib/teleprompter/preferencias";
import { calcularPlan, type Plan } from "@/lib/teleprompter/ritmo";
import type { EscenaTeleprompter, TomaGuardada } from "@/lib/tipos";

export const planDe = (escena: EscenaTeleprompter, ritmo: number): Plan =>
  calcularPlan(
    escena.cues.map((cue) => ({ texto: cue.texto, pausa: cue.pausa ?? 0 })),
    ritmo,
  );

export function estadoInicial(
  escena: EscenaTeleprompter | undefined,
  grabada: boolean,
  vistaCamara: Preferencias["vistaCamara"],
): string {
  if (!escena) return "Listo.";
  if (escena.modo === "voz") {
    return grabada
      ? `Ya grabada: ${escena.id}.wav (puedes repetirla).`
      : "Pulsa Grabar cuando estés listo.";
  }
  return vistaCamara === "puntos"
    ? "Empezar pone en marcha el cronómetro."
    : "Pulsa Empezar y dale a grabar en tu cámara durante la cuenta atrás.";
}

// La toma que se escucha en el pie (solo en las escenas de voz): la subida en esta sesión o,
// si no, la que ya estaba grabada.
export function tomaEscena(
  escena: EscenaTeleprompter | undefined,
  voz: boolean,
  tomas: Record<string, TomaGuardada>,
): string | null {
  if (!voz || !escena) return null;
  const tomaLocal = tomas[escena.id];
  if (tomaLocal) return urlToma(tomaLocal.ruta, tomaLocal.version);
  if (escena.grabada && escena.toma) return urlToma(escena.toma, escena.version_toma);
  return null;
}
