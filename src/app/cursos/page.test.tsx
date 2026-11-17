import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaginaCursos from "@/app/cursos/page";
import { ApiNoDisponible, ErrorApi, obtenerCursos } from "@/lib/api";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/acciones-tareas", () => ({
  crearCurso: vi.fn(),
  borrarCurso: vi.fn(),
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

  it("distingue un rechazo de la API de un fallo de conexión", async () => {
    vi.mocked(obtenerCursos).mockRejectedValue(new ErrorApi(403));

    render(await PaginaCursos());

    expect(
      screen.getByText("La API ha rechazado la petición (estado 403)"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No se puede conectar con la API"),
    ).not.toBeInTheDocument();
  });
});
