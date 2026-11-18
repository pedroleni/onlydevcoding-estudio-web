import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({ cancelarTrabajo: vi.fn() }));

import { ContenidoTrabajos } from "@/app/trabajos/page";
import { obtenerTrabajos } from "@/lib/api";

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, obtenerTrabajos: vi.fn() };
});

describe("página de trabajos", () => {
  beforeEach(() => {
    vi.mocked(obtenerTrabajos).mockResolvedValue([
      {
        id: 42,
        accion: "render-leccion",
        curso: "react",
        numero: 4,
        objetivo: "previa-v3.mp4",
        estado: "en_marcha",
        progreso: 0.4,
        inicio: "2026-11-18T10:00:00Z",
        fin: null,
        error: null,
      },
      {
        id: 41,
        accion: "video-final",
        curso: "react",
        numero: 3,
        objetivo: "previa-v2.mp4",
        estado: "cancelado",
        progreso: 0.25,
        inicio: "2026-11-18T09:00:00Z",
        fin: "2026-11-18T09:01:00Z",
        error: "Cancelado",
      },
    ]);
  });

  it("pinta trabajos cancelados y en marcha con su botón", async () => {
    render(await ContenidoTrabajos());

    expect(obtenerTrabajos).toHaveBeenCalledWith(20);
    const filas = screen.getAllByRole("row");
    expect(filas).toHaveLength(3);
    expect(within(filas[1]).getByText("Renderizar una versión nueva")).toBeInTheDocument();
    expect(within(filas[1]).getByText("En marcha")).toBeInTheDocument();
    expect(within(filas[1]).getByText("40 %")).toBeInTheDocument();
    expect(within(filas[1]).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(within(filas[2]).getByText("Crear el vídeo final (−14 LUFS)")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Cancelado")).toBeInTheDocument();
    expect(within(filas[2]).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "react · 4" })).toHaveAttribute(
      "href",
      "/cursos/react/4",
    );
  });
});
