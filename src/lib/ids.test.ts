import { describe, expect, it } from "vitest";

import { idDesdeNombre } from "@/lib/ids";

describe("idDesdeNombre", () => {
  it.each([
    ["Edición rápida", 30, "edicion-rapida"],
    ["  C++ / Avanzado ", 30, "c-avanzado"],
    ["Python", 40, "python"],
    ["Ñandú 2", 40, "nandu-2"],
    ["---", 30, ""],
    ["a".repeat(50), 30, "a".repeat(30)],
    ["palabra-que-termina-en-guion-justo-en-el-limite x", 30, "palabra-que-termina-en-guion-j"],
  ])("convierte %j en %j", (nombre, maximo, esperado) => {
    expect(idDesdeNombre(nombre, maximo)).toBe(esperado);
  });

  it("no deja un guion al final tras recortar", () => {
    expect(idDesdeNombre("abcde fghij", 6)).toBe("abcde");
  });
});
