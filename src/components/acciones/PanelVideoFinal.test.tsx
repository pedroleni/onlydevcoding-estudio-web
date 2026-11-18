import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PanelVideoFinal } from "@/components/acciones/PanelVideoFinal";
import { lanzarAccion } from "@/lib/acciones-estudio";
import type { EstadoAccion, IdAccion, Trabajo } from "@/lib/tipos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

function accion(id: IdAccion, cambios: Partial<EstadoAccion> = {}): EstadoAccion {
  return {
    id,
    etiqueta: id === "render-leccion"
      ? "Renderizar una versión nueva"
      : "Crear el vídeo final (−14 LUFS)",
    disponible: true,
    motivo: null,
    opciones: [],
    ultimo: null,
    ultimos: {},
    ...cambios,
  };
}

const trabajo: Trabajo = {
  id: 9,
  accion: "video-final",
  curso: "curso-ficticio",
  numero: 4,
  objetivo: "previa-v11.mp4",
  estado: "en_marcha",
  progreso: 0,
  inicio: "2026-11-18T10:00:00Z",
  fin: null,
  error: null,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("PanelVideoFinal", () => {
  it("elige por defecto la última previa y la envía tras confirmar", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo });
    render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={["ruta/previa-v2.mp4", "ruta/previa-v10.mp4"]}
        acciones={[
          accion("render-leccion"),
          accion("video-final", {
            opciones: ["previa-v2.mp4", "previa-v11.mp4"],
          }),
        ]}
      />,
    );

    const selector = screen.getByRole("combobox", { name: "Previa para el vídeo final" });
    expect(within(selector).getAllByRole("option")).toHaveLength(2);
    expect(selector).toHaveValue("previa-v11.mp4");

    await userEvent.click(
      screen.getByRole("button", { name: "Crear el vídeo final (−14 LUFS)" }),
    );

    expect(confirmar).toHaveBeenCalledWith(
      "Se creará el vídeo final a −14 LUFS desde previa-v11.mp4. Si ya hay un vídeo final, se guardará en anteriores/. ¿Seguimos?",
    );
    expect(lanzarAccion).toHaveBeenCalledWith(
      "curso-ficticio",
      4,
      "video-final",
      { previa: "previa-v11.mp4" },
    );
  });

  it("envía la previa elegida a mano", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo });
    render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={[]}
        acciones={[
          accion("video-final", {
            opciones: ["previa-v2.mp4", "previa-v11.mp4"],
          }),
        ]}
      />,
    );

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Previa para el vídeo final" }),
      "previa-v2.mp4",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Crear el vídeo final (−14 LUFS)" }),
    );

    expect(lanzarAccion).toHaveBeenCalledWith(
      "curso-ficticio",
      4,
      "video-final",
      { previa: "previa-v2.mp4" },
    );
  });

  it("sigue la última previa nueva hasta que el usuario elige otra", async () => {
    const { rerender } = render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={[]}
        acciones={[
          accion("video-final", {
            opciones: ["previa-v2.mp4", "previa-v11.mp4"],
          }),
        ]}
      />,
    );
    const selector = screen.getByRole("combobox", { name: "Previa para el vídeo final" });

    rerender(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={[]}
        acciones={[
          accion("video-final", {
            opciones: ["previa-v2.mp4", "previa-v11.mp4", "previa-v12.mp4"],
          }),
        ]}
      />,
    );
    expect(selector).toHaveValue("previa-v12.mp4");

    await userEvent.selectOptions(selector, "previa-v2.mp4");
    rerender(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={[]}
        acciones={[
          accion("video-final", {
            opciones: [
              "previa-v2.mp4",
              "previa-v11.mp4",
              "previa-v12.mp4",
              "previa-v13.mp4",
            ],
          }),
        ]}
      />,
    );
    expect(selector).toHaveValue("previa-v2.mp4");
  });

  it("calcula el siguiente número y desactiva Renderizar con el motivo de la API", () => {
    render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={["ruta/previa-v2.mp4", "ruta/previa-v10.mp4"]}
        acciones={[
          accion("render-leccion", {
            disponible: false,
            motivo: "Guion cambiado: hay que regenerar el montaje",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Renderizar una versión nueva (previa-v11)",
      }),
    ).toBeDisabled();
    expect(
      screen.getByText("Guion cambiado: hay que regenerar el montaje"),
    ).toBeInTheDocument();
  });

  it("sin opciones no muestra selector y desactiva el vídeo final", () => {
    render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={[]}
        acciones={[
          accion("video-final", {
            disponible: true,
            motivo: "No hay ninguna previa disponible",
          }),
        ]}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Crear el vídeo final (−14 LUFS)" }),
    ).toBeDisabled();
    expect(screen.getByText("No hay ninguna previa disponible")).toBeInTheDocument();
  });

  it("cambiar de previa no borra el mensaje del último lanzamiento", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    render(
      <PanelVideoFinal
        curso="curso-ficticio"
        numero={4}
        previas={["ruta/previa-v1.mp4", "ruta/previa-v2.mp4"]}
        acciones={[
          accion("video-final", { opciones: ["previa-v1.mp4", "previa-v2.mp4"] }),
        ]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Crear el vídeo final (−14 LUFS)" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("Ya hay un trabajo en marcha");

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Previa para el vídeo final" }),
      "previa-v1.mp4",
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Ya hay un trabajo en marcha");
  });
});
