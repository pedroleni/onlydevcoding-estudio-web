import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BarraEscenas } from "@/components/teleprompter/BarraEscenas";
import type { EscenaTeleprompter } from "@/lib/tipos";

function escena(
  id: string,
  modo: EscenaTeleprompter["modo"],
  grabada = false,
): EscenaTeleprompter {
  return {
    id,
    modo,
    titulo: `Escena ficticia ${id}`,
    cues: [{ texto: "Frase inventada." }],
    puntos: [],
    grabada,
    toma: null,
    version_toma: null,
  };
}

describe("BarraEscenas", () => {
  it("pinta un botón por escena con ✓ en las voces grabadas y la actual resaltada", () => {
    render(
      <BarraEscenas
        escenas={[escena("E02", "camara"), escena("E03", "voz", true), escena("E04", "voz")]}
        indice={2}
        grabadas={new Set(["E03"])}
        alElegir={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "E03 ✓" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "E04" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "E03 ✓" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "E02" })).toHaveAttribute(
      "title",
      "Escena ficticia E02",
    );
  });

  it("no marca como grabada una escena a cámara", () => {
    render(
      <BarraEscenas
        escenas={[escena("E02", "camara", true)]}
        indice={0}
        grabadas={new Set(["E02"])}
        alElegir={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "E02" })).toBeInTheDocument();
  });

  it("avisa del índice elegido", async () => {
    const alElegir = vi.fn();
    render(
      <BarraEscenas
        escenas={[escena("E03", "voz"), escena("E04", "voz")]}
        indice={0}
        grabadas={new Set()}
        alElegir={alElegir}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "E04" }));
    expect(alElegir).toHaveBeenCalledWith(1);
  });

  it("se puede desactivar entera", () => {
    render(
      <BarraEscenas
        escenas={[escena("E03", "voz"), escena("E04", "voz")]}
        indice={0}
        grabadas={new Set()}
        alElegir={vi.fn()}
        desactivada
      />,
    );

    expect(screen.getByRole("button", { name: "E03" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "E04" })).toBeDisabled();
  });
});
