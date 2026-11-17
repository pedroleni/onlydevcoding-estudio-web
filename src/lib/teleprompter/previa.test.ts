import { describe, expect, it } from "vitest";

import type { Plan } from "./ritmo";
import { objetivoLectura, objetivoToma } from "./previa";

const plan: Plan = {
  pasos: [
    { c: 0, p: 0, desde: 0, hasta: 1 },
    { c: 1, p: 0, desde: 2, hasta: 3 },
  ],
  total: 4,
};

describe("objetivoLectura", () => {
  it("respeta el margen inicial de la escena", () => {
    const objetivo = objetivoLectura({
      t: 0,
      plan,
      escenaMontaje: { inicio: 300, duracion: 180, cues: [0, 60] },
      fps: 30,
      iniciosFrases: [0, 2],
    });

    expect(objetivo.tiempo).toBe(10.05);
  });

  it("mapea la segunda frase a su tramo cuando coinciden las frases", () => {
    const objetivo = objetivoLectura({
      t: 2.5,
      plan,
      escenaMontaje: { inicio: 300, duracion: 180, cues: [0, 60] },
      fps: 30,
      iniciosFrases: [0, 2],
    });

    expect(objetivo).toEqual({ tiempo: 13, ritmo: 2, pausar: false });
  });

  it("reparte la escena entera cuando no coincide el número de frases", () => {
    const objetivo = objetivoLectura({
      t: 2,
      plan,
      escenaMontaje: { inicio: 300, duracion: 180, cues: [0] },
      fps: 30,
      iniciosFrases: [0, 2],
    });

    expect(objetivo).toEqual({ tiempo: 13, ritmo: 1.5, pausar: false });
  });

  it("marca la pausa una vez pasado el final", () => {
    expect(
      objetivoLectura({
        t: 4,
        plan,
        escenaMontaje: { inicio: 300, duracion: 180, cues: [0, 60] },
        fps: 30,
        iniciosFrases: [0, 2],
      }).pausar,
    ).toBe(true);
  });

  it("usa un intervalo mínimo de 0.2 segundos para calcular el ritmo", () => {
    const objetivo = objetivoLectura({
      t: 0.15,
      plan: {
        pasos: [
          { c: 0, p: 0, desde: 0, hasta: 0.05 },
          { c: 1, p: 0, desde: 0.1, hasta: 0.15 },
        ],
        total: 0.2,
      },
      escenaMontaje: { inicio: 0, duracion: 2, cues: [0, 1] },
      fps: 10,
      iniciosFrases: [0, 0.1],
    });

    expect(objetivo.ritmo).toBe(0.5);
    expect(objetivo.tiempo).toBeCloseTo(0.125);
  });
});

describe("objetivoToma", () => {
  it("respeta el margen inicial de la escena", () => {
    const objetivo = objetivoToma({
      tiempoToma: 0,
      duracionToma: 10,
      escenaMontaje: { inicio: 300, duracion: 180, cues: [0, 60] },
      fps: 30,
    });

    expect(objetivo.tiempo).toBe(10.05);
  });

  it("estira la escena a la toma y respeta el margen final", () => {
    const objetivo = objetivoToma({
      tiempoToma: 10,
      duracionToma: 10,
      escenaMontaje: { inicio: 300, duracion: 180, cues: [0, 60] },
      fps: 30,
    });

    expect(objetivo).toEqual({ tiempo: 15.95, ritmo: 0.6, pausar: true });
  });

  it.each([
    [1, 10, 0.25],
    [1, 0.1, 4],
  ])("limita el ritmo para %s s de escena y %s s de toma", (duracion, toma, ritmo) => {
    expect(
      objetivoToma({
        tiempoToma: 0,
        duracionToma: toma,
        escenaMontaje: { inicio: 0, duracion, cues: [] },
        fps: 1,
      }).ritmo,
    ).toBe(ritmo);
  });
});
