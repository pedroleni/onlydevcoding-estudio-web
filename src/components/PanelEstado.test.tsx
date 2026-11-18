import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanelEstado } from "@/components/PanelEstado";
import type { EstadoLeccion, EstadoMontaje, PiezaVista, RedVista } from "@/lib/tipos";

const vacio: EstadoLeccion = {
  guion: false,
  voz: { hechas: 0, total: 0 },
  camara: { hechas: 0, total: 0 },
  video_final: false,
  miniatura: null,
  previa: null,
  publicado: {},
};

describe("PanelEstado", () => {
  it("marca la voz completa", () => {
    render(
      <PanelEstado estado={{ ...vacio, voz: { hechas: 13, total: 13 } }} />,
    );

    expect(screen.getByText(/Voz grabada/)).toHaveTextContent("✅");
  });

  it("lista las cuatro redes", () => {
    render(<PanelEstado estado={vacio} />);

    ["YouTube", "Instagram", "TikTok", "LinkedIn"].forEach((red) => {
      expect(screen.getByText(red)).toBeInTheDocument();
    });
  });

  it.each([
    ["al_dia", "✅", "Montaje: al día"],
    ["guion_cambiado", "⚠️", "Montaje: guion cambiado"],
    ["voz_sin_alinear", "⚠️", "Montaje: voz sin alinear"],
    ["sin_montaje", "⬜", "Montaje: sin montaje"],
  ] as const)("distingue con texto el montaje %s", (estado, icono, texto) => {
    const montaje: EstadoMontaje = { estado, sin_alinear: [] };
    render(<PanelEstado estado={vacio} montaje={montaje} />);

    const linea = screen.getByText(texto).closest("li");
    expect(linea).toHaveTextContent(icono);
    expect(within(linea!).getByText(icono)).toHaveAttribute("aria-hidden", "true");
  });

  it("omite la línea de montaje cuando la API antigua no lo aporta", () => {
    render(<PanelEstado estado={vacio} montaje={null} />);

    expect(screen.queryByText(/Montaje/)).not.toBeInTheDocument();
  });
});


function red(id: RedVista["red"], estado: RedVista["estado"]["estado"] = "pendiente", conTextos = true): RedVista {
  return {
    red: id,
    textos: conTextos
      ? { titulos: [], descripcion: "x", etiquetas: [], texto: null, comentario_fijado: null, ajustes: [], video: null, notas: null }
      : null,
    estado: { estado, fecha: estado === "pendiente" ? null : "2026-11-18T19:00:00+01:00", url: null },
  };
}

function pieza(id: string, tipo: PiezaVista["tipo"], titulo: string, redes: RedVista[]): PiezaVista {
  return { id, tipo, titulo, video: null, duracion: null, fecha_propuesta: null, portadas: [], portada_elegida: null, redes };
}

describe("PanelEstado con las piezas de publicación", () => {
  const piezas = [
    pieza("leccion", "leccion", "Lección completa", [red("youtube", "publicado"), red("linkedin"), red("instagram", "pendiente", false)]),
    pieza("short-1", "short", "Short 1 · Tu navegador no entiende React", [
      red("youtube", "publicado"),
      red("instagram", "programado"),
      red("tiktok"),
    ]),
  ];

  it("separa cada pieza con solo sus redes y su estado en cada una", () => {
    render(<PanelEstado estado={vacio} curso="react" numero={2} piezas={piezas} />);

    const leccion = screen.getByRole("listitem", { name: "Lección completa" });
    expect(within(leccion).getByText("YouTube").closest("a")).toHaveTextContent("✅");
    expect(within(leccion).getByText("LinkedIn").closest("a")).toHaveTextContent("⬜");
    // La lección no se publica en Instagram: no aparece.
    expect(within(leccion).queryByText("Instagram")).toBeNull();

    const corto = screen.getByRole("listitem", { name: "Short 1 · Tu navegador no entiende React" });
    expect(within(corto).getByText("Instagram").closest("a")).toHaveTextContent("📅");
    expect(within(corto).getByText("TikTok").closest("a")).toHaveTextContent("⬜");
    expect(within(corto).getByText("TikTok").closest("a")).toHaveAttribute(
      "href",
      "/cursos/react/2?pestana=publicar&pieza=short-1&red=tiktok",
    );
  });
});
