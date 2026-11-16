import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NoEncontrada from "@/app/not-found";

describe("página no encontrada", () => {
  it("explica el error en castellano y permite volver a cursos", () => {
    render(<NoEncontrada />);

    expect(screen.getByText("No se ha encontrado esta página")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Volver a cursos" })).toHaveAttribute(
      "href",
      "/cursos",
    );
  });
});
