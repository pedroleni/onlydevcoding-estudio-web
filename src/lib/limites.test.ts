import { describe, expect, it } from "vitest";

import {
  LIMITES_PUBLICACION,
  errorLimitesTextos,
} from "@/lib/limites";
import type { TextosRed } from "@/lib/tipos";

const textosVacios: TextosRed = {
  titulos: [],
  descripcion: null,
  etiquetas: [],
  texto: null,
  comentario_fijado: null,
  ajustes: [],
  video: null,
  notas: null,
};

describe("límites de publicación", () => {
  it("mantiene los valores exactos de la API", () => {
    expect(LIMITES_PUBLICACION).toEqual({
      tituloYoutube: 100,
      descripcionYoutube: 5000,
      etiquetasYoutube: 500,
      textoInstagramTikTok: 2200,
      textoLinkedIn: 3000,
      comentarioFijado: 10000,
      maximoLineas: 30,
      caracteresPorLinea: 300,
      notas: 2000,
    });
  });

  it("aplica título, descripción y etiquetas solo a YouTube", () => {
    const textosLargos = {
      ...textosVacios,
      titulos: ["a".repeat(101)],
      descripcion: "a".repeat(5001),
      etiquetas: ["a".repeat(501)],
    };

    expect(errorLimitesTextos("youtube", textosLargos)).toEqual(
      "El campo titulos supera los 100 caracteres",
    );
    expect(errorLimitesTextos("instagram", textosLargos)).toBeNull();
  });

  it.each([
    ["instagram", 2200],
    ["tiktok", 2200],
    ["linkedin", 3000],
  ] as const)("aplica a %s su límite de texto", (red, limite) => {
    expect(
      errorLimitesTextos(red, {
        ...textosVacios,
        texto: "a".repeat(limite + 1),
      }),
    ).toEqual(`El campo texto supera los ${limite} caracteres`);
  });

  it("valida comentario, notas, líneas y saltos igual que la API", () => {
    expect(
      errorLimitesTextos("youtube", {
        ...textosVacios,
        comentario_fijado: "a".repeat(10001),
      }),
    ).toContain("comentario_fijado");
    expect(
      errorLimitesTextos("youtube", {
        ...textosVacios,
        notas: "a".repeat(2001),
      }),
    ).toContain("notas");
    expect(
      errorLimitesTextos("youtube", {
        ...textosVacios,
        ajustes: Array.from({ length: 31 }, () => "a"),
      }),
    ).toContain("30 líneas");
    expect(
      errorLimitesTextos("youtube", {
        ...textosVacios,
        ajustes: ["línea\npartida"],
      }),
    ).toContain("no admite saltos de línea");
    expect(
      errorLimitesTextos("youtube", {
        ...textosVacios,
        titulos: ["título\npartido"],
      }),
    ).toContain("no admite saltos de línea");
  });
});
