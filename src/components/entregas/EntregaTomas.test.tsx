import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EntregaTomas } from "@/components/entregas/EntregaTomas";
import { subirEntrega, type ResultadoSubida } from "@/components/entregas/subirEntrega";
import { colocarTomas, leerEntregas, quitarEntrega } from "@/lib/acciones-entregas";
import { lanzarAccion } from "@/lib/acciones-estudio";
import { TrabajoInexistente } from "@/lib/error-trabajo";
import type { Entregas, PropuestaTomas, Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-entregas", () => ({
  leerEntregas: vi.fn(),
  quitarEntrega: vi.fn(),
  colocarTomas: vi.fn(),
}));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));
vi.mock("@/components/entregas/subirEntrega", () => ({ subirEntrega: vi.fn() }));

const AVISO_E17 =
  "E17 ya tiene una toma: la nueva la sustituye (la anterior se guarda en anteriores/) y se pierden las animaciones puestas sobre ella.";

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 50,
    accion: "identificar-tomas",
    curso: "react",
    numero: 4,
    objetivo: null,
    estado: "en_marcha",
    progreso: 0,
    inicio: "2026-11-18T10:00:00Z",
    fin: null,
    error: null,
    ...cambios,
  };
}

const MENSAJE_SIN_LANZAR = "No se han podido identificar las tomas. Vuelve a intentarlo.";

const TEXTO_LARGO =`${"palabra ".repeat(30)}final que no se ve`;

function propuesta(): PropuestaTomas {
  return {
    version: 1,
    guion: "react-04",
    archivos: [
      {
        archivo: "Toma ficticia 1.MOV",
        bytes: 100,
        orientacion: "horizontal",
        duracion: 41.4,
        texto: TEXTO_LARGO,
        propuesta: { tipo: "camara", id: "E17" },
        repite: null,
        candidatos: [],
      },
      {
        archivo: "Toma ficticia 2.MOV",
        bytes: 100,
        orientacion: "horizontal",
        duracion: 39,
        texto: "Texto ficticio repetido",
        propuesta: null,
        repite: { tipo: "camara", id: "E17" },
        candidatos: [],
      },
      {
        archivo: "Facetune ficticio.MOV",
        bytes: 100,
        orientacion: "vertical",
        duracion: 12.2,
        texto: "Gancho ficticio",
        propuesta: { tipo: "gancho", id: "S2" },
        repite: null,
        candidatos: [],
      },
    ],
  };
}

function entregas(cambios: Partial<Entregas> = {}): Entregas {
  return {
    archivos: [
      { archivo: "Facetune ficticio.MOV", bytes: 100 },
      { archivo: "Toma ficticia 1.MOV", bytes: 100 },
      { archivo: "Toma ficticia 2.MOV", bytes: 100 },
      { archivo: "Toma rota.MOV", bytes: 100 },
    ],
    propuesta: propuesta(),
    destinos: {
      camara: [
        { id: "E08", titulo: "Escena ficticia ocho", tiene_toma: false },
        { id: "E17", titulo: "Escena ficticia diecisiete", tiene_toma: true },
      ],
      ganchos: [
        { id: "S2", titulo: "Gancho ficticio dos", entregado: false },
        { id: "S3", titulo: "Gancho ficticio tres", entregado: false },
      ],
    },
    ...cambios,
  };
}

const VACIAS: Entregas = {
  archivos: [],
  propuesta: null,
  destinos: { camara: [], ganchos: [] },
};

function video(nombre: string): File {
  return new File(["ftypqt"], nombre, { type: "video/quicktime" });
}

function zona(): HTMLElement {
  const input = screen.getByLabelText(/Entregar los vídeos de la cámara/);
  return input.closest("label") as HTMLElement;
}

function soltar(archivos: File[]) {
  fireEvent.drop(zona(), { dataTransfer: { files: archivos, types: ["Files"] } });
}

function destino(archivo: string): HTMLSelectElement {
  return screen.getByRole("combobox", { name: `Destino de ${archivo}` });
}

describe("EntregaTomas", () => {
  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: VACIAS });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("muestra la zona del boceto con un selector de archivos accesible", async () => {
    render(<EntregaTomas curso="react" numero={4} />);

    const input = screen.getByLabelText(/Entregar los vídeos de la cámara/);
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("multiple");
    expect(input).toHaveAttribute("accept", "video/quicktime,video/mp4,.mov,.mp4");
    expect(screen.getByText("⬆ Entregar los vídeos de la cámara")).toBeInTheDocument();
    expect(screen.getByText("Arrastra aquí las tomas (Facetune, iPhone…)")).toBeInTheDocument();
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledWith("react", 4));
  });

  it("sube dos archivos soltados de uno en uno y lanza identificar-tomas una vez", async () => {
    const pendientes: Array<(resultado: ResultadoSubida) => void> = [];
    vi.mocked(subirEntrega).mockImplementation(
      ({ archivo, alAvanzar }) =>
        new Promise((resolver) => {
          alAvanzar(0.25);
          pendientes.push(() => resolver({ ok: true, archivo: archivo.name, bytes: 6 }));
        }),
    );
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    render(<EntregaTomas curso="react" numero={4} />);

    soltar([video("Toma ficticia 1.MOV"), video("Toma ficticia 2.MOV")]);

    await waitFor(() => expect(subirEntrega).toHaveBeenCalledTimes(1));
    expect(vi.mocked(subirEntrega).mock.calls[0][0].archivo.name).toBe("Toma ficticia 1.MOV");
    expect(
      screen.getByRole("progressbar", { name: "Subida de Toma ficticia 1.MOV" }),
    ).toHaveAttribute("aria-valuenow", "25");
    expect(lanzarAccion).not.toHaveBeenCalled();

    await act(async () => pendientes[0]({ ok: true, archivo: "", bytes: 0 }));
    await waitFor(() => expect(subirEntrega).toHaveBeenCalledTimes(2));
    expect(vi.mocked(subirEntrega).mock.calls[1][0].archivo.name).toBe("Toma ficticia 2.MOV");
    expect(lanzarAccion).not.toHaveBeenCalled();

    await act(async () => pendientes[1]({ ok: true, archivo: "", bytes: 0 }));
    await waitFor(() =>
      expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "identificar-tomas", {}),
    );
    expect(lanzarAccion).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Identificando las tomas/)).toBeInTheDocument();
  });

  it("un error de un archivo no corta los demás y se identifica lo subido", async () => {
    vi.mocked(subirEntrega)
      .mockResolvedValueOnce({
        ok: false,
        cancelada: false,
        mensaje: "Ya hay una toma con ese nombre",
      })
      .mockResolvedValueOnce({ ok: true, archivo: "Toma ficticia 2.MOV", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    render(<EntregaTomas curso="react" numero={4} />);

    soltar([video("Toma ficticia 1.MOV"), video("Toma ficticia 2.MOV")]);

    await waitFor(() => expect(lanzarAccion).toHaveBeenCalledOnce());
    expect(subirEntrega).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("alert")).toHaveTextContent("Ya hay una toma con ese nombre");
  });

  it("cancela una subida en curso con su señal", async () => {
    vi.mocked(subirEntrega).mockImplementation(
      ({ senal }) =>
        new Promise((resolver) => {
          senal.addEventListener("abort", () =>
            resolver({ ok: false, cancelada: true, mensaje: "Subida cancelada" }),
          );
        }),
    );
    render(<EntregaTomas curso="react" numero={4} />);

    soltar([video("Toma ficticia 1.MOV")]);
    await userEvent.click(
      await screen.findByRole("button", { name: "Cancelar la subida de Toma ficticia 1.MOV" }),
    );

    expect(await screen.findByText("Subida cancelada")).toBeInTheDocument();
    expect(lanzarAccion).not.toHaveBeenCalled();
  });

  it("vuelve a leer las entregas cuando termina la identificación", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:03:00Z" }),
    );
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });

    soltar([video("x.mov")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(lanzarAccion).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(leerTrabajo).toHaveBeenCalledWith(50);
    expect(destino("Toma ficticia 1.MOV")).toHaveValue("E17");
  });

  it("revisa la propuesta: preseleccionada, por orientación y con las repetidas", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    render(<EntregaTomas curso="react" numero={4} />);

    const horizontal = await screen.findByRole("combobox", {
      name: "Destino de Toma ficticia 1.MOV",
    });
    expect(horizontal).toHaveValue("E17");
    expect(destino("Toma ficticia 2.MOV")).toHaveValue("");
    expect(destino("Facetune ficticio.MOV")).toHaveValue("S2");

    const opcionesHorizontal = within(horizontal)
      .getAllByRole("option")
      .map((opcion) => opcion.textContent);
    expect(opcionesHorizontal).toEqual([
      "No usar",
      "E08 · Escena ficticia ocho",
      "E17 · Escena ficticia diecisiete",
    ]);
    const opcionesVertical = within(destino("Facetune ficticio.MOV"))
      .getAllByRole("option")
      .map((opcion) => opcion.textContent);
    expect(opcionesVertical).toEqual([
      "No usar",
      "S2 · Gancho ficticio dos",
      "S3 · Gancho ficticio tres",
      "Cierre",
    ]);

    const fila = horizontal.closest("li") as HTMLElement;
    expect(within(fila).getByText("Horizontal")).toBeInTheDocument();
    expect(within(fila).getByText("0:41")).toBeInTheDocument();
    expect(within(fila).getByText(`${TEXTO_LARGO.slice(0, 140)}…`)).toBeInTheDocument();
    expect(screen.getByText("Vertical")).toBeInTheDocument();
    expect(screen.getByText("Repetida de E17")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Quitar / })).toHaveLength(4);
  });

  it("enseña las tomas que no se han podido analizar y deja quitarlas", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(quitarEntrega).mockResolvedValue({ ok: true });
    render(<EntregaTomas curso="react" numero={4} />);

    const aviso = await screen.findByText("No se ha podido analizar");
    const fila = aviso.closest("li") as HTMLElement;
    expect(within(fila).getByText("Toma rota.MOV")).toBeInTheDocument();
    expect(within(fila).queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(within(fila).getByRole("button", { name: "Quitar Toma rota.MOV" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(quitarEntrega).toHaveBeenCalledWith("react", 4, "Toma rota.MOV");
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledTimes(2));
  });

  it("pide confirmación si un destino ya tiene toma y, si se cancela, no coloca", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(window.confirm).mockReturnValue(false);
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Colocar las tomas" }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(AVISO_E17));
    expect(colocarTomas).not.toHaveBeenCalled();
  });

  it("coloca las tomas analizadas con su destino y avisa al terminar", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(colocarTomas).mockResolvedValue({
      ok: true,
      resultado: {
        colocadas: [{ archivo: "Toma ficticia 1.MOV", destino: "E08" }],
        ganchos: 0,
      },
    });
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.selectOptions(
      await screen.findByRole("combobox", { name: "Destino de Toma ficticia 1.MOV" }),
      "E08",
    );
    await userEvent.selectOptions(destino("Facetune ficticio.MOV"), "");
    await userEvent.click(screen.getByRole("button", { name: "Colocar las tomas" }));

    expect(window.confirm).not.toHaveBeenCalled();
    expect(colocarTomas).toHaveBeenCalledWith("react", 4, [
      { archivo: "Toma ficticia 1.MOV", destino: "E08" },
      { archivo: "Toma ficticia 2.MOV", destino: null },
      { archivo: "Facetune ficticio.MOV", destino: null },
    ]);
    expect(await screen.findByText("Tomas colocadas.")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    expect(lanzarAccion).not.toHaveBeenCalled();
  });

  it("con ganchos colocados no ajusta el color: dice que están colocadas y refresca", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(colocarTomas).mockResolvedValue({
      ok: true,
      resultado: {
        colocadas: [{ archivo: "Facetune ficticio.MOV", destino: "S2" }],
        ganchos: 1,
      },
    });
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Colocar las tomas" }));

    expect(await screen.findByText("Tomas colocadas.")).toBeInTheDocument();
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
    expect(lanzarAccion).not.toHaveBeenCalled();
    expect(screen.queryByText(/color/i)).not.toBeInTheDocument();
  });

  it("muestra en una alerta el mensaje de un 422 al colocar", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(colocarTomas).mockResolvedValue({
      ok: false,
      mensaje: "Hay dos tomas para el mismo destino",
    });
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Colocar las tomas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Hay dos tomas para el mismo destino",
    );
    expect(screen.queryByText("Tomas colocadas.")).not.toBeInTheDocument();
  });

  it("en una escena, la preselecciona para lo subido aquí que la propuesta deja sin destino", async () => {
    const sinPropuesta = entregas({
      archivos: [{ archivo: "Toma nueva.MOV", bytes: 6 }, { archivo: "Toma vieja.MOV", bytes: 6 }],
      propuesta: {
        version: 1,
        guion: "react-04",
        archivos: ["Toma nueva.MOV", "Toma vieja.MOV"].map((archivo) => ({
          archivo,
          bytes: 6,
          orientacion: "horizontal" as const,
          duracion: 10,
          texto: "Texto ficticio",
          propuesta: null,
          repite: null,
          candidatos: [],
        })),
      },
    });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "Toma nueva.MOV", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:00Z" }),
    });
    render(<EntregaTomas curso="react" numero={4} escena="E08" />);
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledOnce());
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: sinPropuesta });

    soltar([video("Toma nueva.MOV")]);

    expect(
      await screen.findByRole("combobox", { name: "Destino de Toma nueva.MOV" }),
    ).toHaveValue("E08");
    expect(destino("Toma vieja.MOV")).toHaveValue("");
  });
  it("si el trabajo de identificar desaparece, deja de esperarlo y vuelve a leer las entregas", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockRejectedValue(new TrabajoInexistente());
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    soltar([video("x.mov")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText("Identificando las tomas…")).toBeInTheDocument();
    const lecturas = vi.mocked(leerEntregas).mock.calls.length;
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(leerTrabajo).toHaveBeenCalledWith(50);
    expect(screen.queryByText(/Identificando las tomas/)).not.toBeInTheDocument();
    expect(vi.mocked(leerEntregas).mock.calls.length).toBeGreaterThan(lecturas);
    expect(destino("Toma ficticia 1.MOV")).toHaveValue("E17");
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeEnabled();
  });

  it("mientras se identifica, la zona de soltar está desactivada y lo dice", async () => {
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockReturnValue(new Promise(() => undefined));
    render(<EntregaTomas curso="react" numero={4} />);

    soltar([video("x.mov")]);
    expect(await screen.findByText("Identificando las tomas…")).toBeInTheDocument();

    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeDisabled();
    expect(
      screen.getByText("Espera a que se identifiquen las tomas para entregar más."),
    ).toBeInTheDocument();
    soltar([video("otra.mov")]);
    expect(subirEntrega).toHaveBeenCalledOnce();
  });

  it("al terminar, relanza la identificación una vez si quedan tomas nuevas sin analizar", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const hecho = trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:03:00Z" });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "Toma ficticia 1.MOV", bytes: 6 });
    vi.mocked(lanzarAccion)
      .mockResolvedValueOnce({ ok: true, trabajo: trabajo() })
      .mockResolvedValueOnce({ ok: true, trabajo: trabajo({ id: 60 }) });
    vi.mocked(leerTrabajo).mockImplementation(async (id) => ({ ...hecho, id }));
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    // Mientras se identificaba, otra toma ha llegado a entregas/ (por ejemplo, desde otra pestaña).
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });

    soltar([video("Toma ficticia 1.MOV")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(lanzarAccion).toHaveBeenCalledOnce();

    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(lanzarAccion).toHaveBeenCalledTimes(2);
    expect(lanzarAccion).toHaveBeenLastCalledWith("react", 4, "identificar-tomas", {});

    // La segunda tampoco la analiza: no se vuelve a lanzar.
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(lanzarAccion).toHaveBeenCalledTimes(2);
    expect(screen.getByText("No se ha podido analizar")).toBeInTheDocument();
  });

  it("no relanza por las tomas que ya estaban al identificar", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "Toma ficticia 1.MOV", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:03:00Z" }),
    );
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));

    soltar([video("Toma ficticia 1.MOV")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(lanzarAccion).toHaveBeenCalledOnce();
    expect(screen.getByText("No se ha podido analizar")).toBeInTheDocument();
  });

  it("si la identificación se cancela, no la relanza", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "cancelado", fin: "2026-11-18T10:03:00Z" }),
    );
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });

    soltar([video("x.mov")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(lanzarAccion).toHaveBeenCalledOnce();
  });

  it("preselecciona la escena en la que se soltó la toma aunque la zona haya cambiado de escena", async () => {
    const sinPropuesta = entregas({
      archivos: [{ archivo: "Toma nueva.MOV", bytes: 6 }],
      propuesta: {
        version: 1,
        guion: "react-04",
        archivos: [
          {
            archivo: "Toma nueva.MOV",
            bytes: 6,
            orientacion: "horizontal",
            duracion: 10,
            texto: "Texto ficticio",
            propuesta: null,
            repite: null,
            candidatos: [],
          },
        ],
      },
    });
    let terminar!: () => void;
    vi.mocked(subirEntrega).mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ ok: true, archivo: "Toma nueva.MOV", bytes: 6 });
        }),
    );
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:00Z" }),
    });
    const { rerender } = render(<EntregaTomas curso="react" numero={4} escena="E08" />);
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledOnce());
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: sinPropuesta });

    soltar([video("Toma nueva.MOV")]);
    await waitFor(() => expect(subirEntrega).toHaveBeenCalledOnce());
    rerender(<EntregaTomas curso="react" numero={4} escena="E17" />);
    await act(async () => terminar());

    expect(
      await screen.findByRole("combobox", { name: "Destino de Toma nueva.MOV" }),
    ).toHaveValue("E08");
  });
});

describe("EntregaTomas: ronda 1", () => {
  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: VACIAS });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("avisa con alCambiarSubiendo de cuándo empieza y acaba una subida", async () => {
    let terminar!: () => void;
    vi.mocked(subirEntrega).mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ ok: true, archivo: "x.mov", bytes: 6 });
        }),
    );
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockReturnValue(new Promise(() => undefined));
    const alCambiarSubiendo = vi.fn();
    render(<EntregaTomas curso="react" numero={4} alCambiarSubiendo={alCambiarSubiendo} />);
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledOnce());
    expect(alCambiarSubiendo).toHaveBeenLastCalledWith(false);

    soltar([video("x.mov")]);
    await waitFor(() => expect(alCambiarSubiendo).toHaveBeenLastCalledWith(true));

    await act(async () => terminar());
    await waitFor(() => expect(alCambiarSubiendo).toHaveBeenLastCalledWith(false));
  });

  it("si la Server Action de identificar lanza, la zona vuelve a estar activa y lo dice", async () => {
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockRejectedValue(new Error("fallo de red ficticio"));
    render(<EntregaTomas curso="react" numero={4} />);
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledOnce());

    soltar([video("x.mov")]);

    await waitFor(() => expect(lanzarAccion).toHaveBeenCalledOnce());
    expect(await screen.findByText(MENSAJE_SIN_LANZAR)).toBeInTheDocument();
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeEnabled();
    expect(screen.queryByText(/fallo de red ficticio/)).not.toBeInTheDocument();
  });

  it("al terminar la identificación, la zona sigue desactivada mientras se vuelven a leer las entregas", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:03:00Z" }),
    );
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    soltar([video("x.mov")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(lanzarAccion).toHaveBeenCalledOnce();

    let leer!: (entregas: Entregas) => void;
    vi.mocked(leerEntregas).mockImplementation(
      () =>
        new Promise((resolver) => {
          leer = (leidas) => resolver({ ok: true, entregas: leidas });
        }),
    );
    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(leerEntregas).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Identificando las tomas/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeDisabled();
    soltar([video("otra.mov")]);
    expect(subirEntrega).toHaveBeenCalledOnce();

    await act(async () => leer(VACIAS));
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeEnabled();
    expect(lanzarAccion).toHaveBeenCalledOnce();
  });

  it("si la lectura tras identificar falla, la zona vuelve a estar activa", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "x.mov", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:03:00Z" }),
    );
    render(<EntregaTomas curso="react" numero={4} />);
    await act(() => vi.advanceTimersByTimeAsync(0));
    soltar([video("x.mov")]);
    await act(() => vi.advanceTimersByTimeAsync(0));
    vi.mocked(leerEntregas).mockResolvedValue({ ok: false, mensaje: "La API no responde" });

    await act(() => vi.advanceTimersByTimeAsync(2000));

    expect(screen.getByRole("alert")).toHaveTextContent("La API no responde");
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).toBeEnabled();
  });
});

describe("EntregaTomas: fallos de las Server Actions y revisión bloqueada", () => {
  const SIN_LEER = "No se han podido leer las tomas entregadas. Vuelve a intentarlo.";
  const SIN_QUITAR = "No se ha podido quitar la toma. Vuelve a intentarlo.";
  const SIN_COLOCAR = "No se han podido colocar las tomas. Vuelve a intentarlo.";

  beforeEach(() => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function estadoColor(enMarchaColor: Trabajo) {
    return [
      {
        id: "color-ganchos" as const,
        etiqueta: "Ajustar el color de los ganchos",
        disponible: true,
        motivo: null,
        opciones: [],
        ultimo: enMarchaColor,
        ultimos: { S2: enMarchaColor },
      },
    ];
  }

  it("si la primera lectura lanza, lo dice con un mensaje fijo", async () => {
    vi.mocked(leerEntregas).mockRejectedValue(new Error("detalle interno ficticio"));
    render(<EntregaTomas curso="react" numero={4} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(SIN_LEER);
    expect(screen.queryByText(/detalle interno ficticio/)).not.toBeInTheDocument();
  });

  it("si quitar lanza, lo dice y la revisión vuelve a estar activa", async () => {
    vi.mocked(quitarEntrega).mockRejectedValue(new Error("detalle interno ficticio"));
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Quitar Toma rota.MOV" }));

    expect(await screen.findByText(SIN_QUITAR)).toBeInTheDocument();
    expect(screen.getByText(SIN_QUITAR)).toHaveAttribute("role", "alert");
    expect(screen.queryByText(/detalle interno ficticio/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Quitar Toma rota.MOV" })).toBeEnabled(),
    );
    expect(screen.getByRole("button", { name: "Colocar las tomas" })).toBeEnabled();
  });

  it("si colocar lanza, lo dice y la revisión vuelve a estar activa", async () => {
    vi.mocked(colocarTomas).mockRejectedValue(new Error("detalle interno ficticio"));
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Colocar las tomas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(SIN_COLOCAR);
    expect(screen.queryByText("Tomas colocadas.")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Colocar las tomas" })).toBeEnabled(),
    );
    expect(destino("Toma ficticia 1.MOV")).toBeEnabled();
  });

  it("mientras se lanza la identificación, la revisión está bloqueada", async () => {
    let responder!: (valor: Awaited<ReturnType<typeof lanzarAccion>>) => void;
    vi.mocked(lanzarAccion).mockImplementation(
      () =>
        new Promise((resolver) => {
          responder = resolver;
        }),
    );
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Identificar las tomas" }));

    expect(screen.getByRole("button", { name: "Colocar las tomas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quitar Toma rota.MOV" })).toBeDisabled();
    expect(destino("Toma ficticia 1.MOV")).toBeDisabled();

    await act(async () => responder({ ok: false, mensaje: "No hay tomas entregadas" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Colocar las tomas" })).toBeEnabled(),
    );
  });

  it("un ajuste de color en marcha no se sigue aquí ni bloquea la revisión", async () => {
    render(
      <EntregaTomas
        curso="react"
        numero={4}
        acciones={estadoColor(trabajo({ id: 52, accion: "color-ganchos", objetivo: "S2" }))}
      />,
    );

    expect(await screen.findByRole("button", { name: "Colocar las tomas" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Quitar Toma rota.MOV" })).toBeEnabled();
    expect(destino("Toma ficticia 1.MOV")).toBeEnabled();
    expect(screen.queryByText(/color/i)).not.toBeInTheDocument();
    expect(leerTrabajo).not.toHaveBeenCalled();
  });
});
