import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BotonAccion } from "@/components/acciones/BotonAccion";
import { cancelarTrabajo, lanzarAccion } from "@/lib/acciones-estudio";
import type { EstadoAccion, Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 31,
    accion: "render-short",
    curso: "react",
    numero: 4,
    objetivo: "s1",
    estado: "en_marcha",
    progreso: 0.4,
    inicio: "2026-11-18T10:00:00Z",
    fin: null,
    error: null,
    ...cambios,
  };
}

function accion(cambios: Partial<EstadoAccion> = {}): EstadoAccion {
  return {
    id: "render-short",
    etiqueta: "Renderizar el short",
    disponible: true,
    motivo: null,
    opciones: ["s1"],
    ultimo: null,
    ultimos: {},
    ...cambios,
  };
}

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("BotonAccion", () => {
  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("desactiva una acción no disponible y muestra el motivo", () => {
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({
          disponible: false,
          motivo: "Prepara los shorts antes de renderizar",
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Renderizar el short" })).toBeDisabled();
    expect(screen.getByText("Prepara los shorts antes de renderizar")).toBeInTheDocument();
  });

  it("lanza, muestra el progreso y refresca una vez al terminar", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:04:00Z" }),
    );
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion()}
        opciones={{ short: "s1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Renderizar el short" }));
    await avanzar(0);

    expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "render-short", { short: "s1" });
    expect(screen.getByText("En marcha… 40 %")).toBeInTheDocument();

    await avanzar(2000);

    expect(leerTrabajo).toHaveBeenCalledWith(31);
    expect(screen.getByText("Hecho")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
    await avanzar(6000);
    expect(leerTrabajo).toHaveBeenCalledOnce();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("cancela el trabajo en marcha y refresca la página", async () => {
    vi.mocked(cancelarTrabajo).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ estado: "cancelado", fin: "2026-11-18T10:01:00Z" }),
    });
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(cancelarTrabajo).toHaveBeenCalledWith(31);
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("no lanza si se rechaza la confirmación", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion()}
        confirmar="¿Renderizar una versión nueva?"
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Renderizar el short" }));

    expect(confirmar).toHaveBeenCalledWith("¿Renderizar una versión nueva?");
    expect(lanzarAccion).not.toHaveBeenCalled();
  });
});
