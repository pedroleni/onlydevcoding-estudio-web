import { describe, expect, it } from "vitest";

import { gruposPublicacion, marcaPublicacion } from "@/lib/curso";
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

describe("gruposPublicacion", () => {
  it("separa la lección de los reels y shorts, y solo enseña las redes previstas", () => {
    const e = estado({
      publicado_por_grupo: {
        leccion: {
          youtube: { hechas: 1, total: 1 },
          instagram: { hechas: 0, total: 0 },
          tiktok: { hechas: 0, total: 0 },
          linkedin: { hechas: 0, total: 1 },
        },
        cortos: {
          youtube: { hechas: 1, total: 1 },
          instagram: { hechas: 1, total: 1 },
          tiktok: { hechas: 0, total: 1 },
          linkedin: { hechas: 0, total: 0 },
        },
      },
    });
    expect(gruposPublicacion(e)).toEqual([
      {
        titulo: "Lección",
        marcas: [
          { icono: "✅", texto: "YouTube" },
          { icono: "⬜", texto: "LinkedIn" },
        ],
      },
      {
        titulo: "Reels y shorts",
        marcas: [
          { icono: "✅", texto: "YouTube" },
          { icono: "✅", texto: "Instagram" },
          { icono: "⬜", texto: "TikTok" },
        ],
      },
    ]);
  });

  it("cuenta los cortos publicados cuando hay varios", () => {
    const e = estado({
      publicado_por_grupo: {
        leccion: { youtube: { hechas: 0, total: 1 } },
        cortos: { instagram: { hechas: 2, total: 4 } },
      },
    });
    expect(gruposPublicacion(e)[1]).toEqual({
      titulo: "Reels y shorts",
      marcas: [{ icono: "🟡", texto: "Instagram 2/4" }],
    });
  });

  it("sin grupos (API anterior) devuelve un solo grupo sin título con las cuatro redes", () => {
    const grupos = gruposPublicacion(estado({}));
    expect(grupos).toHaveLength(1);
    expect(grupos[0].titulo).toBeNull();
    expect(grupos[0].marcas.map((m) => m.texto)).toEqual(["YouTube", "Instagram", "TikTok", "LinkedIn"]);
  });
});
