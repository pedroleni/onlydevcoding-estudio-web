import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { TrabajoInexistente } from "@/lib/error-trabajo";
import type { Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

const enMarcha: Trabajo = {
  id: 31,
  accion: "render-leccion",
  curso: "curso-ficticio",
  numero: 4,
  objetivo: "previa-v3.mp4",
  estado: "en_marcha",
  progreso: 0,
  inicio: "2026-11-18T10:00:00Z",
  fin: null,
  error: null,
};

function PruebaSeguimiento({ alDesaparecer }: { alDesaparecer?: (id: number) => void }) {
  const trabajo = useSeguimientoTrabajo({ trabajo: enMarcha, alDesaparecer });
  return <span>{trabajo?.estado}</span>;
}

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useSeguimientoTrabajo", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("refresca una sola vez cuando el trabajo termina en error", async () => {
    vi.mocked(leerTrabajo).mockResolvedValue({
      ...enMarcha,
      estado: "error",
      fin: "2026-11-18T10:01:00Z",
      error: "Remotion terminó con el código 1",
    });
    render(<PruebaSeguimiento />);

    await avanzar(2000);
    expect(screen.getByText("error")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();

    await avanzar(6000);
    expect(leerTrabajo).toHaveBeenCalledOnce();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("limpia el temporizador y el listener al desmontar", async () => {
    vi.mocked(leerTrabajo).mockResolvedValue(enMarcha);
    const quitarListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<PruebaSeguimiento />);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(quitarListener).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
    await avanzar(4000);
    expect(leerTrabajo).not.toHaveBeenCalled();
  });

  it("con un 404 deja de consultar, avisa una vez y no refresca", async () => {
    vi.mocked(leerTrabajo).mockRejectedValue(new TrabajoInexistente());
    const alDesaparecer = vi.fn();
    render(<PruebaSeguimiento alDesaparecer={alDesaparecer} />);

    await avanzar(2000);
    expect(alDesaparecer).toHaveBeenCalledExactlyOnceWith(31);

    await avanzar(10_000);
    expect(leerTrabajo).toHaveBeenCalledOnce();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
