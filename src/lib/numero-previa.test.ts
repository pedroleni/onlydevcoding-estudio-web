import { describe, expect, it } from "vitest";

import { numeroPrevia } from "@/lib/numero-previa";

describe("numeroPrevia", () => {
  it.each([
    ["previa-v3.mp4", 3],
    ["cursos/ficticio/previa/previa-v12.mp4", 12],
    ["previa.mp4", null],
    ["otra-previa-v2.mp4", null],
    ["previa-v2.mp4.bak", null],
  ])("%s → %s", (ruta, numero) => {
    expect(numeroPrevia(ruta)).toBe(numero);
  });
});
