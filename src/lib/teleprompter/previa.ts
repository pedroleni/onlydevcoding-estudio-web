import type { Plan } from "./ritmo";

export type EscenaMontaje = {
  inicio: number;
  duracion: number;
  cues: number[];
};

export type ObjetivoPrevia = {
  tiempo: number;
  ritmo: number;
  pausar: boolean;
};

type ParametrosLectura = {
  t: number;
  plan: Plan;
  escenaMontaje: EscenaMontaje;
  fps: number;
  iniciosFrases: number[];
};

type ParametrosToma = {
  tiempoToma: number;
  duracionToma: number;
  escenaMontaje: EscenaMontaje;
  fps: number;
};

const limitarRitmo = (ritmo: number) =>
  Math.min(4, Math.max(0.25, ritmo));

export function objetivoLectura({
  t,
  plan,
  escenaMontaje,
  fps,
  iniciosFrases,
}: ParametrosLectura): ObjetivoPrevia {
  const numeroFrases = iniciosFrases.length;
  let inicioVideo: number;
  let finVideo: number;
  let inicioPlan: number;
  let finPlan: number;

  if (escenaMontaje.cues.length === numeroFrases) {
    let frase = 0;
    while (
      frase + 1 < numeroFrases &&
      t >= iniciosFrases[frase + 1]
    ) {
      frase++;
    }
    inicioPlan = iniciosFrases[frase];
    finPlan =
      frase + 1 < numeroFrases
        ? iniciosFrases[frase + 1]
        : plan.total;
    inicioVideo =
      (escenaMontaje.inicio + escenaMontaje.cues[frase]) / fps;
    finVideo =
      (escenaMontaje.inicio +
        (frase + 1 < numeroFrases
          ? escenaMontaje.cues[frase + 1]
          : escenaMontaje.duracion)) /
      fps;
  } else {
    inicioPlan = 0;
    finPlan = plan.total;
    inicioVideo = escenaMontaje.inicio / fps;
    finVideo = (escenaMontaje.inicio + escenaMontaje.duracion) / fps;
  }

  const finEscena =
    (escenaMontaje.inicio + escenaMontaje.duracion) / fps - 0.05;
  const inicioEscena = escenaMontaje.inicio / fps + 0.05;
  const ritmo = limitarRitmo(
    (finVideo - inicioVideo) / Math.max(0.2, finPlan - inicioPlan),
  );
  const tiempo = Math.min(
    finEscena,
    Math.max(
      inicioEscena,
      inicioVideo,
      inicioVideo + (t - inicioPlan) * ritmo,
    ),
  );

  return { tiempo, ritmo, pausar: t >= plan.total };
}

export function objetivoToma({
  tiempoToma,
  duracionToma,
  escenaMontaje,
  fps,
}: ParametrosToma): ObjetivoPrevia {
  const inicio = escenaMontaje.inicio / fps;
  const duracion = escenaMontaje.duracion / fps;
  const ritmo = limitarRitmo(duracion / duracionToma);
  const tiempo = Math.min(
    inicio + duracion - 0.05,
    Math.max(inicio + 0.05, inicio + tiempoToma * ritmo),
  );

  return { tiempo, ritmo, pausar: tiempoToma >= duracionToma };
}
