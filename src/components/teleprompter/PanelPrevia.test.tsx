import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PanelPrevia } from "@/components/teleprompter/PanelPrevia";
import { generarPreviaGrabacion } from "@/lib/acciones-teleprompter";
import { urlMedio } from "@/lib/medios";
import type { EstadoPrevia, Montaje, Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/acciones-teleprompter", () => ({
  guardarTextos: vi.fn(),
  generarPreviaGrabacion: vi.fn(),
}));

vi.mock("@/lib/trabajos", () => ({
  leerTrabajo: vi.fn(),
}));

const montaje: Montaje = {
  fps: 30,
  duracion: 900,
  escenas: [{ id: "E03", modo: "voz", inicio: 300, duracion: 150, cues: [0, 60] }],
};

const sinPrevia: EstadoPrevia = {
  ruta: null,
  existe: false,
  desactualizada: false,
  version: null,
  trabajo: null,
};

const conPrevia: EstadoPrevia = {
  ruta: "out/previas-grabacion/react-04.mp4",
  existe: true,
  desactualizada: false,
  version: 7,
  trabajo: null,
};

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 12,
    accion: "previa-grabacion",
    curso: "react",
    numero: 4,
    estado: "en_marcha",
    progreso: 0.4,
    inicio: "2026-01-01T10:00:00",
    fin: null,
    error: null,
    registro: [],
    ...cambios,
  };
}

function pintar(previa: EstadoPrevia, datosMontaje: Montaje | null = montaje, escena = "E03") {
  const alCargarVideo = vi.fn();
  const resultado = render(
    <PanelPrevia
      curso="react"
      numero={4}
      previa={previa}
      montaje={datosMontaje}
      escena={escena}
      alCargarVideo={alCargarVideo}
    />,
  );
  return { ...resultado, alCargarVideo };
}

let visibilidad: DocumentVisibilityState = "visible";

beforeEach(() => {
  visibilidad = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibilidad);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("PanelPrevia", () => {
  it("sin montaje lo dice", () => {
    pintar(sinPrevia, null);

    expect(screen.getByText("Esta lección aún no tiene montaje.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generar vista previa" })).not.toBeInTheDocument();
    expect(screen.getByText("sin vista previa")).toBeInTheDocument();
  });

  it("con la previa hecha pone el vídeo sin sonido con su versión", () => {
    const { container, alCargarVideo } = pintar(conPrevia);

    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.getAttribute("src")).toBe(`${urlMedio(conPrevia.ruta!)}&v=7`);
    expect(video?.muted).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(screen.getByText("lo que sale en pantalla")).toBeInTheDocument();
    expect(screen.getByText("voz provisional, sin sonido")).toBeInTheDocument();

    fireEvent.loadedMetadata(video!);
    expect(alCargarVideo).toHaveBeenCalled();
  });

  it("si la escena no está en el montaje no pone vídeo", () => {
    const { container } = pintar(conPrevia, montaje, "E09");

    expect(container.querySelector("video")).toBeNull();
    expect(screen.getByText("sin vista previa")).toBeInTheDocument();
  });

  it("sin previa ofrece generarla y, al hacerlo, sigue el trabajo cada 2 s", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(generarPreviaGrabacion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ progreso: 0 }),
    });
    vi.mocked(leerTrabajo).mockResolvedValue(trabajo({ progreso: 0.25 }));
    pintar(sinPrevia);

    expect(
      screen.getByText("La vista previa tarda unos minutos y se hace una sola vez por lección."),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));
    await avanzar(0);

    expect(generarPreviaGrabacion).toHaveBeenCalledWith("react", 4);
    expect(screen.getByText("0 %")).toBeInTheDocument();
    expect(leerTrabajo).not.toHaveBeenCalled();

    await avanzar(2000);
    expect(leerTrabajo).toHaveBeenCalledWith(12);
    expect(screen.getByText("25 %")).toBeInTheDocument();
  });

  it("si no puede generarla, dice por qué", async () => {
    vi.mocked(generarPreviaGrabacion).mockResolvedValue({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    pintar(sinPrevia);

    await userEvent.click(screen.getByRole("button", { name: "Generar vista previa" }));

    expect(await screen.findByText("Ya hay un trabajo en marcha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar vista previa" })).toBeEnabled();
  });

  it("con un trabajo en marcha al 40 % lo muestra y, al acabar en hecho, refresca", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo)
      .mockResolvedValueOnce(trabajo({ progreso: 0.7 }))
      .mockResolvedValueOnce(trabajo({ estado: "hecho", progreso: 1 }));
    pintar({ ...sinPrevia, trabajo: trabajo() });

    expect(screen.getByText(/Generando la vista previa…/)).toBeInTheDocument();
    expect(screen.getByText("40 %")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");

    await avanzar(1999);
    expect(leerTrabajo).not.toHaveBeenCalled();
    await avanzar(1);
    expect(screen.getByText("70 %")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();

    await avanzar(2000);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByText("100 %")).toBeInTheDocument();

    await avanzar(10_000);
    expect(leerTrabajo).toHaveBeenCalledTimes(2);
  });

  it("si el trabajo falla, lo dice y deja volver a generarla", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo).mockResolvedValueOnce(
      trabajo({ estado: "error", error: "Remotion terminó con el código 1" }),
    );
    pintar({ ...sinPrevia, trabajo: trabajo() });

    await avanzar(2000);

    expect(screen.getByText(/Falló la última vez \(Remotion terminó con el código 1\)\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar vista previa" })).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
    await avanzar(10_000);
    expect(leerTrabajo).toHaveBeenCalledTimes(1);
  });

  it("un trabajo interrumpido también se da como fallido", () => {
    pintar({ ...sinPrevia, trabajo: trabajo({ estado: "interrumpido" }) });

    expect(screen.getByText(/Falló la última vez \(se interrumpió\)\./)).toBeInTheDocument();
  });

  it("no consulta con la página oculta y vuelve a hacerlo al verse", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo).mockResolvedValue(trabajo({ progreso: 0.5 }));
    visibilidad = "hidden";
    pintar({ ...sinPrevia, trabajo: trabajo() });

    await avanzar(6000);
    expect(leerTrabajo).not.toHaveBeenCalled();

    visibilidad = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await avanzar(2000);
    expect(leerTrabajo).toHaveBeenCalledTimes(1);

    visibilidad = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await avanzar(6000);
    expect(leerTrabajo).toHaveBeenCalledTimes(1);
  });

  it("deja de consultar al desmontar", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo).mockResolvedValue(trabajo({ progreso: 0.5 }));
    const { unmount } = pintar({ ...sinPrevia, trabajo: trabajo() });

    await avanzar(2000);
    expect(leerTrabajo).toHaveBeenCalledTimes(1);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
    await avanzar(6000);
    expect(leerTrabajo).toHaveBeenCalledTimes(1);
  });

  it("con el montaje cambiado avisa y ofrece Regenerar", async () => {
    vi.mocked(generarPreviaGrabacion).mockResolvedValue({ ok: true, trabajo: trabajo({ progreso: 0 }) });
    const { container } = pintar({ ...conPrevia, desactualizada: true });

    expect(screen.getByText("el montaje ha cambiado: regénerala")).toBeInTheDocument();
    expect(container.querySelector("video")).not.toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Regenerar" }));

    expect(generarPreviaGrabacion).toHaveBeenCalledWith("react", 4);
    expect(await screen.findByText("0 %")).toBeInTheDocument();
  });
});
