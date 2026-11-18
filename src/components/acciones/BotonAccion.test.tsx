import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BotonAccion } from "@/components/acciones/BotonAccion";
import { cancelarTrabajo, lanzarAccion } from "@/lib/acciones-estudio";
import { TrabajoInexistente } from "@/lib/error-trabajo";
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
    vi.spyOn(window, "confirm").mockReturnValue(true);
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

    await userEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));

    expect(cancelarTrabajo).toHaveBeenCalledWith(31);
    expect(await screen.findByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("muestra En marcha también con progreso cero", () => {
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo({ progreso: 0 }) })}
      />,
    );

    expect(screen.getByText("En marcha…")).toBeInTheDocument();
  });

  it.each([
    ["error", "Falló: Remotion terminó con el código 1"],
    ["interrumpido", "Interrumpido"],
  ] as const)("muestra el estado terminal %s", (estado, texto) => {
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({
          ultimo: trabajo({
            estado,
            fin: "2026-11-18T10:01:00Z",
            error: estado === "error" ? "Remotion terminó con el código 1" : null,
          }),
        })}
      />,
    );

    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it("mantiene Cancelando hasta que el sondeo ve un estado final", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(cancelarTrabajo).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "cancelado", fin: "2026-11-18T10:01:00Z" }),
    );
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(0);

    expect(screen.getByText("Cancelando…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar el trabajo" })).toBeDisabled();

    await avanzar(2000);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
  });

  it("aísla el trabajo y el lanzamiento de dos objetivos", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ id: 33, objetivo: "s2", progreso: 0 }),
    });
    const compartida = accion({
      ultimo: trabajo({ id: 32, objetivo: "otro", progreso: 0.8 }),
      ultimos: {
        s1: trabajo({ id: 30, objetivo: "s1", estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:00Z" }),
        s2: trabajo({ id: 31, objetivo: "s2", estado: "error", error: "Fallo s2", fin: "2026-11-18T10:02:00Z" }),
      },
    });
    render(
      <div>
        <section aria-label="short s1">
          <BotonAccion curso="react" numero={4} accion={compartida} objetivo="s1" />
        </section>
        <section aria-label="short s2">
          <BotonAccion curso="react" numero={4} accion={compartida} objetivo="s2" />
        </section>
      </div>,
    );

    expect(within(screen.getByLabelText("short s1")).getByText("Hecho")).toBeInTheDocument();
    expect(within(screen.getByLabelText("short s2")).getByText("Falló: Fallo s2")).toBeInTheDocument();
    expect(screen.queryByText("En marcha… 80 %")).not.toBeInTheDocument();

    await userEvent.click(
      within(screen.getByLabelText("short s2")).getByRole("button", {
        name: "Renderizar el short",
      }),
    );
    expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "render-short", { short: "s2" });
  });

  it("en mejorar-toma el objetivo es la escena: sigue su trabajo y la envía como escena", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ id: 40, accion: "mejorar-toma", objetivo: "E17", progreso: 0 }),
    });
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({
          id: "mejorar-toma",
          etiqueta: "Mejorar con IA",
          opciones: ["E08", "E17"],
          ultimos: {
            E08: trabajo({ id: 38, accion: "mejorar-toma", objetivo: "E08", estado: "error", error: "Fallo E08", fin: "2026-11-18T10:02:00Z" }),
          },
        })}
        objetivo="E17"
      />,
    );

    expect(screen.queryByText(/Fallo E08/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mejorar con IA" }));

    expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "mejorar-toma", { escena: "E17" });
  });

  it("ignora un error de cancelación que llega después del estado final", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    let resolver!: (resultado: { ok: false; mensaje: string }) => void;
    vi.mocked(cancelarTrabajo).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "cancelado", fin: "2026-11-18T10:01:00Z" }),
    );
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(2000);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();

    resolver({ ok: false, mensaje: "Ese trabajo no está en marcha" });
    await avanzar(0);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("no refresca dos veces si la respuesta de cancelar llega después que el sondeo", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const cancelado = trabajo({ estado: "cancelado", error: "Cancelado", fin: "2026-11-18T10:01:00Z" });
    let resolver!: (resultado: { ok: true; trabajo: Trabajo }) => void;
    vi.mocked(cancelarTrabajo).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    vi.mocked(leerTrabajo).mockResolvedValue(cancelado);
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(2000);
    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();

    resolver({ ok: true, trabajo: cancelado });
    await avanzar(0);
    await avanzar(6000);

    expect(screen.getByText("Cancelado")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("limpia el error de cancelación cuando el sondeo ve el estado final", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(cancelarTrabajo).mockResolvedValue({
      ok: false,
      mensaje: "Ese trabajo no está en marcha",
    });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:00Z" }),
    );
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));
    await avanzar(0);
    expect(screen.getByRole("alert")).toHaveTextContent("Ese trabajo no está en marcha");

    await avanzar(2000);

    expect(screen.getByText("Hecho")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

  it("no pinta un error del trabajo con aspecto de ruta", () => {
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({
          ultimo: trabajo({
            estado: "error",
            fin: "2026-11-18T10:01:00Z",
            error: "No existe /ruta/ficticia/montaje.json",
          }),
        })}
      />,
    );

    expect(screen.getByText("Falló")).toBeInTheDocument();
    expect(screen.queryByText(/ruta\/ficticia/)).not.toBeInTheDocument();
  });

  it("da nombres accesibles sin ambigüedad y asocia el motivo", () => {
    const { rerender } = render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ disponible: false, motivo: "Prepara los shorts antes" })}
        objetivo="s3-4-inspector"
        textoBoton="Renderizar"
        nombreAccesible="Renderizar s3-4-inspector"
      />,
    );

    const boton = screen.getByRole("button", { name: "Renderizar s3-4-inspector" });
    expect(boton).toHaveTextContent("Renderizar");
    expect(boton).toHaveAccessibleDescription("Prepara los shorts antes");

    rerender(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({ ultimo: trabajo() })}
      />,
    );
    const cancelar = screen.getByRole("button", { name: "Cancelar el trabajo" });
    expect(cancelar).toHaveTextContent(/^Cancelar$/);
  });

  it("pide confirmación antes de cancelar y no cancela si se rechaza", async () => {
    const confirmar = vi.mocked(window.confirm).mockReturnValue(false);
    render(
      <BotonAccion curso="react" numero={4} accion={accion({ ultimo: trabajo() })} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Cancelar el trabajo" }));

    expect(confirmar).toHaveBeenCalledWith("¿Cancelar el trabajo en marcha?");
    expect(cancelarTrabajo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancelar el trabajo" })).toBeEnabled();
  });

  it("con el 409 de otro trabajo en marcha enlaza a Trabajos", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    render(<BotonAccion curso="react" numero={4} accion={accion()} />);

    await userEvent.click(screen.getByRole("button", { name: "Renderizar el short" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Ya hay un trabajo en marcha");
    expect(within(alerta).getByRole("link", { name: "Ver trabajos" })).toHaveAttribute(
      "href",
      "/trabajos",
    );
  });

  it("borra el mensaje de lanzamiento cuando llegan datos nuevos de la acción", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    const { rerender } = render(
      <BotonAccion curso="react" numero={4} accion={accion()} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Renderizar el short" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    rerender(<BotonAccion curso="react" numero={4} accion={accion()} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deja de sondear y lo dice si el trabajo ya no existe", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo).mockRejectedValue(new TrabajoInexistente());
    render(
      <BotonAccion curso="react" numero={4} accion={accion({ ultimo: trabajo() })} />,
    );

    await avanzar(2000);

    expect(screen.getByText("El trabajo ya no existe.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancelar el trabajo" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renderizar el short" })).toBeEnabled();

    await avanzar(10000);
    expect(leerTrabajo).toHaveBeenCalledOnce();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("sigue sondeando tras un fallo transitorio de lectura", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerTrabajo).mockRejectedValueOnce(new Error("estado 500"));
    vi.mocked(leerTrabajo).mockResolvedValue(trabajo({ progreso: 0.6 }));
    render(
      <BotonAccion curso="react" numero={4} accion={accion({ ultimo: trabajo() })} />,
    );

    await avanzar(4000);

    expect(leerTrabajo).toHaveBeenCalledTimes(2);
    expect(screen.getByText("En marcha… 60 %")).toBeInTheDocument();
  });

  it("con ocultarAnterior no enseña un trabajo terminado de antes, pero sí el lanzado aquí", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ id: 40 }),
    });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ id: 40, estado: "hecho", progreso: 1, fin: "2026-11-18T10:04:00Z" }),
    );
    const alLanzar = vi.fn();
    const alCambiarTrabajo = vi.fn();
    render(
      <BotonAccion
        curso="react"
        numero={4}
        accion={accion({
          ultimo: trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-17T10:00:00Z" }),
        })}
        ocultarAnterior
        alLanzar={alLanzar}
        alCambiarTrabajo={alCambiarTrabajo}
      />,
    );

    expect(screen.queryByText("Hecho")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Renderizar el short" }));
    await avanzar(0);
    expect(alLanzar).toHaveBeenCalledWith(expect.objectContaining({ id: 40 }));
    expect(alCambiarTrabajo).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 40, estado: "en_marcha" }),
    );

    await avanzar(2000);
    expect(screen.getByText("Hecho")).toBeInTheDocument();
    expect(alCambiarTrabajo).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 40, estado: "hecho" }),
    );
  });
});
