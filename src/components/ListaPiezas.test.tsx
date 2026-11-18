import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ListaPiezas, VistaVideoFinal } from "@/components/ListaPiezas";
import type { Pieza } from "@/lib/tipos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

const pieza: Pieza = {
  id: "pieza-falsa",
  tipo: "short",
  titulo: "Pieza de prueba",
  video: null,
  portadas: ["cursos/falso/vertical.jpg"],
};

describe("ListaPiezas", () => {
  it("muestra completas las portadas verticales de shorts y reels", () => {
    render(<ListaPiezas piezas={[pieza]} />);

    expect(screen.getByRole("img")).toHaveClass("aspect-[9/16]", "object-contain");
    expect(screen.getByRole("img")).not.toHaveClass("object-cover");
  });

  it("muestra un fotograma de la previa desde el segundo uno", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={null}
        previas={["previa.mp4"]}
        acciones={null}
      />,
    );

    expect(screen.getByLabelText("Previa seleccionada")).toHaveAttribute(
      "src",
      expect.stringMatching(/#t=1$/),
    );
  });

  it("mantiene las portadas de la lección en 16:9", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={{ ...pieza, tipo: "leccion", video: "final.mp4" }}
        previas={[]}
        acciones={null}
      />,
    );

    expect(screen.getByLabelText("Vídeo final de la lección")).toHaveClass("aspect-video");
  });
});
