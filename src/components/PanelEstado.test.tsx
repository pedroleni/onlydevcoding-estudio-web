import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanelEstado } from "@/components/PanelEstado";
import type { EstadoLeccion, EstadoMontaje } from "@/lib/tipos";

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
