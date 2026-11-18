import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EntregaTomas } from "@/components/entregas/EntregaTomas";
import { subirEntrega, type ResultadoSubida } from "@/components/entregas/subirEntrega";
import { colocarTomas, leerEntregas, quitarEntrega } from "@/lib/acciones-entregas";
import { lanzarAccion } from "@/lib/acciones-estudio";
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

const TEXTO_LARGO = `${"palabra ".repeat(30)}final que no se ve`;

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
      (_curso, _numero, archivo, alAvanzar) =>
        new Promise((resolver) => {
          alAvanzar(0.25);
          pendientes.push(() => resolver({ ok: true, archivo: archivo.name, bytes: 6 }));
        }),
    );
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    render(<EntregaTomas curso="react" numero={4} />);

    soltar([video("Toma ficticia 1.MOV"), video("Toma ficticia 2.MOV")]);

    await waitFor(() => expect(subirEntrega).toHaveBeenCalledTimes(1));
    expect(vi.mocked(subirEntrega).mock.calls[0][2].name).toBe("Toma ficticia 1.MOV");
    expect(
      screen.getByRole("progressbar", { name: "Subida de Toma ficticia 1.MOV" }),
    ).toHaveAttribute("aria-valuenow", "25");
    expect(lanzarAccion).not.toHaveBeenCalled();

    await act(async () => pendientes[0]({ ok: true, archivo: "", bytes: 0 }));
    await waitFor(() => expect(subirEntrega).toHaveBeenCalledTimes(2));
    expect(vi.mocked(subirEntrega).mock.calls[1][2].name).toBe("Toma ficticia 2.MOV");
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
      (_curso, _numero, _archivo, _alAvanzar, senal) =>
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

  it("con ganchos colocados lanza color-ganchos y lo sigue", async () => {
    vi.mocked(leerEntregas).mockResolvedValue({ ok: true, entregas: entregas() });
    vi.mocked(colocarTomas).mockResolvedValue({
      ok: true,
      resultado: {
        colocadas: [{ archivo: "Facetune ficticio.MOV", destino: "S2" }],
        ganchos: 1,
      },
    });
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ id: 51, accion: "color-ganchos", progreso: 0.5 }),
    });
    render(<EntregaTomas curso="react" numero={4} />);

    await userEvent.click(await screen.findByRole("button", { name: "Colocar las tomas" }));

    await waitFor(() =>
      expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "color-ganchos", {}),
    );
    expect(await screen.findByText(/Ajustando el color de los ganchos… 50 %/)).toBeInTheDocument();
    expect(screen.getByText("Tomas colocadas.")).toBeInTheDocument();
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
});
