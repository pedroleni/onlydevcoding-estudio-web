import { describe, expect, it } from "vitest";

import {
  etiquetaPrevia,
  numeroPrevia,
  previaPorDefecto,
} from "@/lib/numero-previa";

describe("numeroPrevia", () => {
  it.each([
    ["previa-v3.mp4", 3],
    ["cursos/ficticio/previa/previa-v12.mp4", 12],
    ["previa-v13-camaras-reales.mp4", 13],
    ["cursos/ficticio/previa/Previa-V5-ESTUDIO.mp4", 5],
    [`previa-v10-${"a".repeat(61)}.mp4`, 10],
    [`previa-v10-${"a".repeat(62)}.mp4`, null],
    ["previa-v10--estudio.mp4", null],
    ["previa-v10-estudio-.mp4", 10],
    ["previa.mp4", null],
    ["otra-previa-v2.mp4", null],
    ["previa-v2.mp4.bak", null],
  ])("%s → %s", (ruta, numero) => {
    expect(numeroPrevia(ruta)).toBe(numero);
  });
});

describe("etiquetaPrevia", () => {
  it.each([
    ["previa-v23.mp4", "Previa 23"],
    ["ruta/previa-v13-camaras-reales.mp4", "Previa 13 · camaras reales"],
    ["ruta/PREVIA-V5-ESTUDIO.mp4", "Previa 5 · estudio"],
    ["otra.mp4", null],
  ])("%s → %s", (ruta, etiqueta) => {
    expect(etiquetaPrevia(ruta)).toBe(etiqueta);
  });
});

describe("previaPorDefecto", () => {
  it("elige la de número mayor y, en el empate, la que no tiene apellido", () => {
    expect(
      previaPorDefecto([
        "previa-v13-camaras-reales.mp4",
        "previa-v2.mp4",
        "previa-v13.mp4",
      ]),
    ).toBe("previa-v13.mp4");
  });

  it("elige la primera del número mayor cuando todas tienen apellido", () => {
    expect(
      previaPorDefecto([
        "previa-v10-estudio.mp4",
        "previa-v10-estudio-720p.mp4",
        "previa-v5-estudio.mp4",
      ]),
    ).toBe("previa-v10-estudio.mp4");
  });
});
