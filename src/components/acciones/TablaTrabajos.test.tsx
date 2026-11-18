import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TablaTrabajos } from "@/components/acciones/TablaTrabajos";
import { cancelarTrabajo } from "@/lib/acciones-estudio";
import type { Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-estudio", () => ({ cancelarTrabajo: vi.fn() }));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 42,
    accion: "render-leccion",
    curso: "react",
    numero: 4,
    objetivo: null,
    estado: "en_marcha",
    progreso: 0.4,
    inicio: "2026-11-18T10:00:00Z",
    fin: null,
    error: null,
    ...cambios,
  };
}

const cancelado = trabajo({
  estado: "cancelado",
  error: "Cancelado",
  fin: "2026-11-18T10:01:00Z",
});

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function fila() {
  return screen.getAllByRole("row")[1];
}

describe("TablaTrabajos", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    router.refresh.mockReset();
    vi.mocked(cancelarTrabajo).mockReset();
    vi.mocked(leerTrabajo).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("muestra Cancelando… con el botón desactivado hasta que el sondeo ve el final", async () => {
    vi.mocked(cancelarTrabajo).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(cancelado);
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar" }));
    await avanzar(0);

    expect(cancelarTrabajo).toHaveBeenCalledWith(42);
    expect(within(fila()).getByText("Cancelando…")).toBeInTheDocument();
    expect(within(fila()).getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await avanzar(2000);

    expect(within(fila()).getByText("Cancelado")).toBeInTheDocument();
    expect(within(fila()).queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("no refresca dos veces si la respuesta de cancelar llega después que el sondeo", async () => {
    let resolver!: (resultado: { ok: true; trabajo: Trabajo }) => void;
    vi.mocked(cancelarTrabajo).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    vi.mocked(leerTrabajo).mockResolvedValue(cancelado);
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar" }));
    await avanzar(2000);
    expect(within(fila()).getByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();

    resolver({ ok: true, trabajo: cancelado });
    await avanzar(0);
    await avanzar(6000);

    expect(within(fila()).getByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("muestra el error de la API si el trabajo ya no estaba en marcha", async () => {
    vi.mocked(cancelarTrabajo).mockResolvedValue({
      ok: false,
      mensaje: "Ese trabajo no está en marcha",
    });
    vi.mocked(leerTrabajo).mockResolvedValue(trabajo());
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar" }));
    await avanzar(0);

    expect(within(fila()).getByRole("alert")).toHaveTextContent(
      "Ese trabajo no está en marcha",
    );
    expect(within(fila()).getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });
});
