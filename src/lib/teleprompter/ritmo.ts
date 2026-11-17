import { trocear } from "./trocear";

export const ESPERA = { coma: 0.22, punto: 0.42, frase: 0.5 };

export type Paso = {
  c: number;
  p?: number;
  pausa?: true;
  desde: number;
  hasta: number;
};

export type Plan = { pasos: Paso[]; total: number };

export function calcularPlan(
  cues: { texto: string; pausa: number }[],
  ppm: number,
): Plan {
  const base = 60 / ppm;
  let tiempo = 0;
  const pasos: Paso[] = [];

  cues.forEach((cue, c) => {
    trocear(cue.texto).forEach(({ t: palabra, dichas }, p) => {
      const duracion = dichas.reduce(
        (suma, dicha) =>
          suma +
          base *
            Math.min(
              1.7,
              Math.max(
                0.55,
                0.5 + dicha.replace(/[^\p{L}\p{N}]/gu, "").length / 10,
              ),
            ),
        0,
      );
      pasos.push({ c, p, desde: tiempo, hasta: tiempo + duracion });
      tiempo +=
        duracion +
        (/[.:;?!…]$/.test(palabra)
          ? ESPERA.punto
          : /,$/.test(palabra)
            ? ESPERA.coma
            : 0);
    });

    const pausa = cue.pausa ?? 0;
    if (pausa >= 1) {
      pasos.push({
        c,
        pausa: true,
        desde: tiempo,
        hasta: tiempo + pausa,
      });
    }
    tiempo += ESPERA.frase + (pausa >= 1 ? pausa : 0);
  });

  return { pasos, total: tiempo };
}

export const mmss = (segundos: number): string =>
  `${Math.floor(segundos / 60)}:${String(Math.floor(segundos % 60)).padStart(2, "0")}`;
