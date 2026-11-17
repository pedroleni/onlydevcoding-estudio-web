import { describe, expect, it } from "vitest";

import { leerNumero, NUMEROS, trocear } from "./trocear";

describe("trocear números escritos con palabras", () => {
  it.each([
    ["dos mil veintiséis.", ["2026."]],
    ["diecinueve punto tres", ["19.3"]],
    ["treinta y cinco", ["35"]],
    ["ciento veinte", ["120"]],
    ["uno, dos", ["1,", "2"]],
    ["dos tres", ["2", "3"]],
  ])("muestra %s con la heurística actual", (texto, visibles) => {
    expect(trocear(texto).map(({ t }) => t)).toEqual(visibles);
  });

  it("conserva uno cuando funciona como pronombre y lo convierte al cerrar", () => {
    expect(trocear("elige uno ahora").map(({ t }) => t)).toEqual([
      "elige",
      "uno",
      "ahora",
    ]);
    expect(trocear("Uno:").map(({ t }) => t)).toEqual(["1:"]);
  });

  it("guarda como dichas todas las palabras del número", () => {
    expect(trocear("dos mil veintiséis")).toEqual([
      {
        t: "2026",
        dichas: ["dos", "mil", "veintiséis"],
      },
    ]);
  });

  it("exporta el vocabulario y el lector de números", () => {
    expect(NUMEROS.novecientos).toBe(900);
    expect(leerNumero(["ciento", "veinte", "ideas"], 0)).toEqual({
      valor: 120,
      fin: 2,
    });
  });
});

describe("trocear nombres de archivo y código", () => {
  it.each([
    ["App punto jsx", ["App.jsx"]],
    ["archivos punto jsx", ["archivos", ".jsx"]],
    ["punto barra", ["./"]],
    ["el punto de", ["el", "punto", "de"]],
    ["Math punto random", ["Math.random"]],
  ])("muestra %s como corresponde", (texto, visibles) => {
    expect(trocear(texto).map(({ t }) => t)).toEqual(visibles);
  });
});
