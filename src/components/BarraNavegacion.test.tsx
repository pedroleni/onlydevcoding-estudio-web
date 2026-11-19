import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/publicacion" }));

import { BarraNavegacion } from "@/components/BarraNavegacion";

describe("BarraNavegacion", () => {
  it("enlaza a Publicación después de Trabajos y la marca como actual en su página", () => {
    render(<BarraNavegacion />);

    const menu = screen.getByRole("navigation", { name: "Navegación principal" });
    const enlaces = within(menu).getAllByRole("link");
    expect(enlaces.map((a) => a.textContent)).toEqual([
      "Cursos",
      "Teleprompter",
      "Tareas",
      "Trabajos",
      "Publicación",
    ]);
    expect(within(menu).getByRole("link", { name: "Publicación" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(menu).getByRole("link", { name: "Publicación" })).toHaveAttribute(
      "href",
      "/publicacion",
    );
  });
});
