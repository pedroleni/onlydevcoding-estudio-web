import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PanelPrevia } from "@/components/teleprompter/PanelPrevia";
import { useSeguimientoPrevia } from "@/components/teleprompter/useSeguimientoPrevia";
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
    objetivo: null,
    estado: "en_marcha",
    progreso: 0.4,
    inicio: "2026-01-01T10:00:00",
    fin: null,
    error: null,
    ...cambios,
  };
}

// El seguimiento del trabajo vive en la sesión; aquí se monta igual, con el panel debajo.
function ConSeguimiento({
  previa,
  montaje: datosMontaje,
  escena,
  alCargarVideo,
}: {
  previa: EstadoPrevia;
  montaje: Montaje | null;
  escena: string;
  alCargarVideo: () => void;
}) {
  const seguimiento = useSeguimientoPrevia({ curso: "react", numero: 4, previa });
  return (
    <PanelPrevia
      previa={previa}
      montaje={datosMontaje}
      escena={escena}
      seguimiento={seguimiento}
      alCargarVideo={alCargarVideo}
    />
  );
}

function pintar(previa: EstadoPrevia, datosMontaje: Montaje | null = montaje, escena = "E03") {
  const alCargarVideo = vi.fn();
  const resultado = render(
    <ConSeguimiento
      previa={previa}
      montaje={datosMontaje}
      escena={escena}
      alCargarVideo={alCargarVideo}
    />,
  );
  // Simula la llegada de datos nuevos de la página (un objeto nuevo, como tras router.refresh()).
  const llegan = (nueva: EstadoPrevia) =>
    resultado.rerender(
      <ConSeguimiento
        previa={{ ...nueva }}
        montaje={datosMontaje}
        escena={escena}
        alCargarVideo={alCargarVideo}
      />,
    );
  return { ...resultado, alCargarVideo, llegan };
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

  it.each([
    ["error", "No se encontró /ruta/ficticia/previa.mp4"],
    ["interrumpido", "No se encontró C:\\carpeta\\ficticia\\previa.mp4"],
  ] as const)(
    "si el error de un trabajo %s trae una ruta, solo dice que falló, sin enseñarla",
    (estado, error) => {
      pintar({ ...sinPrevia, trabajo: trabajo({ estado, error }) });

      expect(screen.getByText(/^Falló la última vez\./)).toBeInTheDocument();
      expect(screen.queryByText(/Falló la última vez \(/)).not.toBeInTheDocument();
      expect(screen.queryByText(/ficticia/)).not.toBeInTheDocument();
      expect(screen.queryByText(/No se encontró/)).not.toBeInTheDocument();
    },
  );

  it("un error genérico de la API se enseña tal cual", () => {
    pintar({
      ...sinPrevia,
      trabajo: trabajo({
        estado: "error",
        error: "La vista previa ha tardado demasiado y se ha cancelado",
      }),
    });

    expect(
      screen.getByText(
        /Falló la última vez \(La vista previa ha tardado demasiado y se ha cancelado\)\./,
      ),
    ).toBeInTheDocument();
  });

  it("un trabajo interrumpido también se da como fallido", () => {
    pintar({ ...sinPrevia, trabajo: trabajo({ estado: "interrumpido" }) });

    expect(screen.getByText(/Falló la última vez \(se interrumpió\)\./)).toBeInTheDocument();
  });

  it("un trabajo cancelado dice que se canceló y deja regenerar", () => {
    pintar({ ...sinPrevia, trabajo: trabajo({ estado: "cancelado", error: "Cancelado" }) });

    expect(screen.getByText(/Falló la última vez \(se canceló\)\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generar vista previa" })).toBeInTheDocument();
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

  describe("tras acabar en hecho", () => {
    function enHecho() {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.mocked(leerTrabajo).mockResolvedValueOnce(trabajo({ estado: "hecho", progreso: 1 }));
      return pintar({ ...sinPrevia, trabajo: trabajo() });
    }

    it("cuando llega la previa nueva, pone el vídeo", async () => {
      const { llegan, container } = enHecho();
      await avanzar(2000);
      expect(router.refresh).toHaveBeenCalledTimes(1);

      llegan({ ...conPrevia, trabajo: trabajo({ estado: "hecho", progreso: 1 }) });
      await avanzar(0);

      expect(container.querySelector("video")).not.toBeNull();
      expect(screen.queryByText("100 %")).not.toBeInTheDocument();
      await avanzar(20_000);
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });

    it("si tras 3 refrescos sigue sin previa, deja de esperar y ofrece Regenerar", async () => {
      vi.mocked(generarPreviaGrabacion).mockResolvedValue({
        ok: true,
        trabajo: trabajo({ id: 13, progreso: 0 }),
      });
      const { llegan } = enHecho();
      await avanzar(2000);
      const sinNada = { ...sinPrevia, trabajo: trabajo({ estado: "hecho", progreso: 1 }) };

      llegan(sinNada);
      await avanzar(0);
      expect(router.refresh).toHaveBeenCalledTimes(2);
      expect(screen.getByText("100 %")).toBeInTheDocument();
      llegan(sinNada);
      await avanzar(0);
      expect(router.refresh).toHaveBeenCalledTimes(3);
      llegan(sinNada);
      await avanzar(0);

      expect(router.refresh).toHaveBeenCalledTimes(3);
      expect(screen.queryByText("100 %")).not.toBeInTheDocument();
      expect(screen.getByText("La vista previa no se ha encontrado al terminar.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Generar vista previa" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Regenerar" }));
      await avanzar(0);
      expect(generarPreviaGrabacion).toHaveBeenCalledWith("react", 4);
      expect(screen.getByText("0 %")).toBeInTheDocument();
    });

    it("con la misma versión de antes tampoco da la previa por buena", async () => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      vi.mocked(leerTrabajo).mockResolvedValueOnce(trabajo({ estado: "hecho", progreso: 1 }));
      const { llegan, container } = pintar({ ...conPrevia, trabajo: trabajo() });
      await avanzar(2000);

      for (let i = 0; i < 3; i++) {
        llegan({ ...conPrevia, trabajo: trabajo({ estado: "hecho", progreso: 1 }) });
        await avanzar(0);
      }

      expect(router.refresh).toHaveBeenCalledTimes(3);
      expect(screen.getByText("La vista previa no se ha encontrado al terminar.")).toBeInTheDocument();
      expect(container.querySelector("video")).toBeNull();
    });

    it("si el refresco no trae datos, vuelve a pedirlos a los 5 s, hasta 3 veces", async () => {
      enHecho();
      await avanzar(2000);
      expect(router.refresh).toHaveBeenCalledTimes(1);

      await avanzar(5000);
      expect(router.refresh).toHaveBeenCalledTimes(2);
      await avanzar(5000);
      expect(router.refresh).toHaveBeenCalledTimes(3);
      await avanzar(5000);

      expect(router.refresh).toHaveBeenCalledTimes(3);
      expect(screen.getByText("La vista previa no se ha encontrado al terminar.")).toBeInTheDocument();
    });
  });
});
