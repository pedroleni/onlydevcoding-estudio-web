import { describe, expect, it } from "vitest";

import { faltaVideoPropio } from "@/lib/redes-publicacion";
import type { RedVista, TextosRed } from "@/lib/tipos";

const TEXTOS: TextosRed = {
  titulos: [],
  descripcion: null,
  etiquetas: [],
  texto: "Post",
  comentario_fijado: null,
  ajustes: [],
  video: null,
  notas: null,
};

function red(id: RedVista["red"], video: string | null, conTextos = true): RedVista {
  return {
    red: id,
    textos: conTextos ? { ...TEXTOS, video } : null,
    estado: { estado: "pendiente", fecha: null, url: null },
  };
}

describe("faltaVideoPropio", () => {
  it("avisa si el LinkedIn de una lección no tiene su clip", () => {
    expect(faltaVideoPropio({ tipo: "leccion" }, red("linkedin", null))).toBe(true);
    expect(faltaVideoPropio({ tipo: "leccion" }, red("linkedin", null, false))).toBe(true);
  });

  it("no avisa si el clip está, ni en otras redes o piezas", () => {
    expect(
      faltaVideoPropio({ tipo: "leccion" }, red("linkedin", "cursos/x/4-linkedin/l.mp4")),
    ).toBe(false);
    expect(faltaVideoPropio({ tipo: "leccion" }, red("youtube", null))).toBe(false);
    expect(faltaVideoPropio({ tipo: "reel" }, red("linkedin", null))).toBe(false);
  });
});
