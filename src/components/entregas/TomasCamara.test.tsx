import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TomasCamara } from "@/components/entregas/TomasCamara";
import { lanzarAccion } from "@/lib/acciones-estudio";
import type { Escena, EstadoAccion, TomasCamara as DatosCamara, Trabajo } from "@/lib/tipos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));
vi.mock("@/components/entregas/EntregaTomas", () => ({
  EntregaTomas: ({
    curso,
    numero,
    escena,
    acciones,
  }: {
    curso: string;
    numero: number;
    escena?: string;
    acciones?: EstadoAccion[] | null;
  }) => (
    <section aria-label="Entregar las tomas de cámara">
      {`${curso}/${numero}/${escena ?? "sin escena"}/${acciones?.length ?? "sin acciones"}`}
    </section>
  ),
}));

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 70,
    accion: "mejorar-toma",
    curso: "react",
    numero: 4,
    objetivo: "E17",
    estado: "en_marcha",
    progreso: 0,
    inicio: "2026-11-18T10:00:00Z",
    fin: null,
    error: null,
    ...cambios,
  };
}

function accion(id: EstadoAccion["id"], etiqueta: string): EstadoAccion {
  return {
    id,
    etiqueta,
    disponible: true,
    motivo: null,
    opciones: [],
    ultimo: null,
    ultimos: {},
  };
}

const ACCIONES: EstadoAccion[] = [
  { ...accion("mejorar-toma", "Mejorar con IA"), opciones: ["E08", "E17"] },
  accion("color-ganchos", "Ajustar el color de los ganchos"),
];

const CAMARA: DatosCamara = {
  escenas: [
    {
      id: "E08",
      titulo: "Escena ficticia ocho",
      video: "estudio/public/grabaciones/react-04/E08.mov",
      version: 1234,
      original: "Toma ficticia 1.MOV",
      mejorada: false,
    },
    {
      id: "E17",
      titulo: "Escena ficticia diecisiete",
      video: "estudio/public/grabaciones/react-04/E17.mov",
      version: 5678,
      original: "Toma ficticia 2.MOV",
      mejorada: true,
    },
    {
      id: "E20",
      titulo: "Escena ficticia veinte",
      video: null,
      version: null,
      original: null,
      mejorada: false,
    },
  ],
  ganchos: [
    {
      id: "S2",
      titulo: "Gancho ficticio dos",
      toma: "B0C045C7",
      video: "estudio/public/shorts/l4/tomas/B0C045C7.mov",
      version: 99,
      color: false,
    },
    {
      id: "S3",
      titulo: "Gancho ficticio tres",
      toma: "0A1B2C3D",
      video: "estudio/public/shorts/l4/tomas/0A1B2C3D.mov",
      version: 100,
      color: true,
    },
    { id: "S4", titulo: "Gancho ficticio cuatro", toma: null, video: null, version: null, color: false },
  ],
};

function escenaGuion(id: string, titulo: string): Escena {
  return {
    id,
    modo: "camara",
    tipo: "camara",
    titulo,
    textos: [],
    inicio_s: null,
    duracion_s: null,
  };
}

const ESCENAS_GUION: Escena[] = [
  escenaGuion("E08", "Escena ficticia ocho"),
  escenaGuion("E17", "Escena ficticia diecisiete"),
];

function pintar(
  camara: DatosCamara | null = CAMARA,
  acciones: EstadoAccion[] | null = ACCIONES,
  escenas: Escena[] = ESCENAS_GUION,
) {
  return render(
    <TomasCamara
      curso="react"
      numero={4}
      camara={camara}
      acciones={acciones}
      avance={{ hechas: 2, total: 3 }}
      escenas={escenas}
    />,
  );
}

function fila(texto: string): HTMLElement {
  return screen.getByText(texto).closest("li") as HTMLElement;
}

describe("TomasCamara", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("titula la sección, enseña el avance y monta la entrega de la lección con sus acciones", () => {
    pintar();

    expect(screen.getByRole("heading", { name: "Tomas a cámara y ganchos" })).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toHaveTextContent(
      "react/4/sin escena/2",
    );
  });

  it("una escena con vídeo lo reproduce con su versión; otra sin toma dice «Sin grabar»", () => {
    pintar();

    const video = screen.getByLabelText("Toma de E08");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video.getAttribute("src")).toMatch(
      /\/api\/medios\?ruta=estudio%2Fpublic%2Fgrabaciones%2Freact-04%2FE08\.mov&v=1234$/,
    );
    const ocho = fila("Escena ficticia ocho");
    expect(within(ocho).getByText("Toma ficticia 1.MOV")).toBeInTheDocument();
    expect(within(ocho).queryByText("✓ Mejorada con IA")).not.toBeInTheDocument();

    expect(within(fila("Escena ficticia diecisiete")).getByText("✓ Mejorada con IA")).toBeInTheDocument();

    const veinte = fila("Escena ficticia veinte");
    expect(within(veinte).getByText("Sin grabar")).toBeInTheDocument();
    expect(within(veinte).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Toma de E20")).not.toBeInTheDocument();
  });

  it("mejorar-toma envía la escena tras confirmar", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Mejorar con IA (E17)" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "Tarda unos 15 minutos por toma. ¿Mejorar E17 con IA?",
    );
    expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "mejorar-toma", { escena: "E17" });
    expect(await within(fila("Escena ficticia diecisiete")).findByText("En marcha…")).toBeInTheDocument();
  });

  it("si no se confirma, no mejora", async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Mejorar con IA (E08)" }));

    expect(lanzarAccion).not.toHaveBeenCalled();
  });

  it("cada escena sigue su propio trabajo de mejora", () => {
    pintar(CAMARA, [
      {
        ...ACCIONES[0],
        ultimo: trabajo({ id: 71, objetivo: "E08" }),
        ultimos: {
          E08: trabajo({ id: 71, objetivo: "E08" }),
          E17: trabajo({ id: 69, estado: "hecho", progreso: 1, fin: "2026-11-18T10:20:00Z" }),
        },
      },
      ACCIONES[1],
    ]);

    expect(within(fila("Escena ficticia ocho")).getByText("En marcha…")).toBeInTheDocument();
    expect(within(fila("Escena ficticia diecisiete")).getByText("Hecho")).toBeInTheDocument();
  });

  it("cada gancho enseña su vídeo y si tiene el color ajustado, con un solo botón de color", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo({ id: 72, accion: "color-ganchos", objetivo: null }),
    });
    pintar();

    const video = screen.getByLabelText("Toma del gancho S2");
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video.getAttribute("src")).toMatch(/B0C045C7\.mov&v=99$/);
    expect(within(fila("Gancho ficticio dos")).getByText("Color sin ajustar")).toBeInTheDocument();
    expect(within(fila("Gancho ficticio tres")).getByText("Color ajustado")).toBeInTheDocument();
    expect(within(fila("Gancho ficticio cuatro")).getByText("Sin grabar")).toBeInTheDocument();

    const botones = screen.getAllByRole("button", { name: "Ajustar el color de los ganchos" });
    expect(botones).toHaveLength(1);
    await userEvent.click(botones[0]);
    expect(lanzarAccion).toHaveBeenCalledWith("react", 4, "color-ganchos", {});
  });

  it("el nombre accesible del botón de IA contiene su texto visible", () => {
    pintar();

    const boton = screen.getByRole("button", { name: "Mejorar con IA (E17)" });
    expect(boton).toHaveTextContent("Mejorar con IA");
    expect(boton.getAttribute("aria-label")).toContain(boton.textContent?.trim());
  });

  it("sin datos de /camara avisa y deja la entrega a la vista", () => {
    pintar(null);

    expect(screen.getByRole("heading", { name: "Tomas a cámara y ganchos" })).toBeInTheDocument();
    expect(screen.getByText("No se han podido leer las tomas a cámara.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Mejorar/ })).not.toBeInTheDocument();
  });

  it("sin datos de /camara pinta debajo del aviso la lista básica de escenas del guion", () => {
    pintar(null);

    const lista = screen.getByRole("list", { name: "Escenas a cámara del guion" });
    const filas = within(lista).getAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText("Escena ficticia ocho")).toBeInTheDocument();
    expect(within(filas[0]).getByText("E08")).toBeInTheDocument();
    expect(within(filas[1]).getByText("Escena ficticia diecisiete")).toBeInTheDocument();
    expect(within(filas[1]).getByText("E17")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Toma de/)).not.toBeInTheDocument();
    const aviso = screen.getByText("No se han podido leer las tomas a cámara.");
    expect(aviso.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sin datos de /camara ni escenas de cámara en el guion, lo dice", () => {
    pintar(null, ACCIONES, []);

    expect(screen.getByText("No se han podido leer las tomas a cámara.")).toBeInTheDocument();
    expect(screen.getByText("No hay escenas de cámara.")).toBeInTheDocument();
  });

  it("con datos de /camara no repite la lista básica", () => {
    pintar();

    expect(
      screen.queryByRole("list", { name: "Escenas a cámara del guion" }),
    ).not.toBeInTheDocument();
  });

  it("sin acciones no ofrece mejorar ni ajustar el color", () => {
    pintar(CAMARA, null);

    expect(screen.getByLabelText("Toma de E08")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("dice si no hay escenas de cámara ni ganchos", () => {
    pintar({ escenas: [], ganchos: [] });

    expect(screen.getByText("No hay escenas de cámara.")).toBeInTheDocument();
    expect(screen.getByText("No hay ganchos.")).toBeInTheDocument();
  });
});
