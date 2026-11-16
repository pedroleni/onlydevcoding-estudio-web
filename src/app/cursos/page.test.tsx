import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaginaCursos from "@/app/cursos/page";
import { ApiNoDisponible, obtenerCursos } from "@/lib/api";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();

  return {
    ...original,
    obtenerCursos: vi.fn(),
  };
});

describe("página de cursos", () => {
  beforeEach(() => {
    vi.mocked(obtenerCursos).mockReset();
  });

  it("con la API apagada muestra el aviso", async () => {
    vi.mocked(obtenerCursos).mockRejectedValue(new ApiNoDisponible());

    render(await PaginaCursos());

    expect(
      screen.getByText("No se puede conectar con la API"),
    ).toBeInTheDocument();
  });
});
