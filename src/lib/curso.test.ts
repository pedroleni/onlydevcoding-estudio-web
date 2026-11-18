import { describe, expect, it } from "vitest";

import { marcaPublicacion } from "@/lib/curso";
import type { EstadoLeccion } from "@/lib/tipos";

function estado(parcial: Partial<EstadoLeccion>): EstadoLeccion {
  return {
    guion: true,
    voz: { hechas: 0, total: 0 },
    camara: { hechas: 0, total: 0 },
    video_final: false,
    miniatura: null,
    previa: null,
    publicado: {},
    ...parcial,
  };
}

describe("marcaPublicacion", () => {
  it("cuenta las piezas publicadas cuando falta alguna", () => {
    const e = estado({
      publicado: { youtube: false },
      publicado_avance: { youtube: { hechas: 4, total: 5 } },
    });
    expect(marcaPublicacion(e, "youtube", "YouTube")).toEqual({
      icono: "🟡",
      texto: "YouTube 4/5",
    });
  });

  it("marca la red como hecha si están todas, con el recuento si hay varias", () => {
    const e = estado({
      publicado: { youtube: true, linkedin: true },
      publicado_avance: {
        youtube: { hechas: 2, total: 2 },
        linkedin: { hechas: 1, total: 1 },
      },
    });
    expect(marcaPublicacion(e, "youtube", "YouTube")).toEqual({ icono: "✅", texto: "YouTube 2/2" });
    expect(marcaPublicacion(e, "linkedin", "LinkedIn")).toEqual({ icono: "✅", texto: "LinkedIn" });
  });

  it("deja la red vacía si no hay nada publicado y sin recuento si no hay avance", () => {
    const sinNada = estado({ publicado_avance: { tiktok: { hechas: 0, total: 3 } } });
    expect(marcaPublicacion(sinNada, "tiktok", "TikTok")).toEqual({ icono: "⬜", texto: "TikTok 0/3" });
    expect(marcaPublicacion(estado({}), "tiktok", "TikTok")).toEqual({ icono: "⬜", texto: "TikTok" });
  });
});
