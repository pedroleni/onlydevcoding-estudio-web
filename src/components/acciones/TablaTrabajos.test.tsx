import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TablaTrabajos } from "@/components/acciones/TablaTrabajos";
import { cancelarTrabajo } from "@/lib/acciones-estudio";
import { TrabajoInexistente } from "@/lib/error-trabajo";
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
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("muestra Cancelando… con el botón desactivado hasta que el sondeo ve el final", async () => {
    vi.mocked(cancelarTrabajo).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(cancelado);
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(0);

    expect(cancelarTrabajo).toHaveBeenCalledWith(42);
    expect(within(fila()).getByText("Cancelando…")).toBeInTheDocument();
    expect(within(fila()).getByRole("button", { name: "Cancelar el trabajo" })).toBeDisabled();

    await avanzar(2000);

    expect(within(fila()).getByText("Cancelado")).toBeInTheDocument();
    expect(within(fila()).queryByRole("button", { name: "Cancelar el trabajo" })).not.toBeInTheDocument();
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

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar el trabajo" }));
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

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(0);

    expect(within(fila()).getByRole("alert")).toHaveTextContent(
      "Ese trabajo no está en marcha",
    );
    expect(within(fila()).getByRole("button", { name: "Cancelar el trabajo" })).toBeEnabled();
  });

  it("pide confirmación antes de cancelar", async () => {
    const confirmar = vi.mocked(window.confirm).mockReturnValue(false);
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    fireEvent.click(within(fila()).getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(0);

    expect(confirmar).toHaveBeenCalledWith("¿Cancelar el trabajo en marcha?");
    expect(cancelarTrabajo).not.toHaveBeenCalled();
  });

  it("enseña el error del trabajo, pero no uno con aspecto de ruta", () => {
    render(
      <TablaTrabajos
        trabajos={[
          trabajo({ id: 1, estado: "error", error: "Remotion terminó con el código 1", fin: "2026-11-18T10:01:00Z" }),
          trabajo({ id: 2, estado: "error", error: "Fallo en /ruta/ficticia/x.mp4", fin: "2026-11-18T10:01:00Z" }),
        ]}
      />,
    );

    const [, primera, segunda] = screen.getAllByRole("row");
    expect(within(primera).getByText("Remotion terminó con el código 1")).toBeInTheDocument();
    expect(within(segunda).getByText("Error")).toBeInTheDocument();
    expect(within(segunda).queryByText(/ruta\/ficticia/)).not.toBeInTheDocument();
  });

  it("deja de sondear y lo dice si el trabajo ya no existe", async () => {
    vi.mocked(leerTrabajo).mockRejectedValue(new TrabajoInexistente());
    render(<TablaTrabajos trabajos={[trabajo()]} />);

    await avanzar(2000);

    expect(within(fila()).getByText("El trabajo ya no existe.")).toBeInTheDocument();
    expect(within(fila()).queryByRole("button", { name: "Cancelar el trabajo" })).not.toBeInTheDocument();
    await avanzar(10000);
    expect(leerTrabajo).toHaveBeenCalledOnce();
  });
});
