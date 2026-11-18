import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({ cancelarTrabajo: vi.fn() }));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

import { ContenidoTrabajos } from "@/app/trabajos/page";
import { cancelarTrabajo } from "@/lib/acciones-estudio";
import { obtenerTrabajos } from "@/lib/api";
import { leerTrabajo } from "@/lib/trabajos";

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

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
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

  it("mantiene desactivado Cancelar hasta que el sondeo confirma el final", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const enMarcha = (await vi.mocked(obtenerTrabajos)())[0];
    vi.mocked(cancelarTrabajo).mockResolvedValue({ ok: true, trabajo: enMarcha });
    vi.mocked(leerTrabajo).mockResolvedValue({
      ...enMarcha,
      estado: "cancelado",
      fin: "2026-11-18T10:01:00Z",
      error: "Cancelado",
    });
    render(await ContenidoTrabajos());

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(cancelarTrabajo).toHaveBeenCalledWith(42);
    expect(screen.getByText("Cancelando…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(2000));
    const filaCancelada = screen.getByText("Renderizar una versión nueva").closest("tr");
    expect(within(filaCancelada!).getByText("Cancelado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
  });
});
