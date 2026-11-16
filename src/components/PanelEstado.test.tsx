import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PanelEstado } from "@/components/PanelEstado";
import type { EstadoLeccion } from "@/lib/tipos";

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
});
