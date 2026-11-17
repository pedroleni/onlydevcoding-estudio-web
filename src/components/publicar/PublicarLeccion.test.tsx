import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { ElegirPortada } from "@/components/publicar/ElegirPortada";
import { EstadoPublicacion } from "@/components/publicar/EstadoPublicacion";
import { PublicarLeccion } from "@/components/publicar/PublicarLeccion";
import { PanelTextosRed } from "@/components/publicar/TextosRed";
import { cambiarEstado, elegirPortada, guardarTextos } from "@/lib/acciones";
import type { PiezaVista, VistaPublicacion } from "@/lib/tipos";

vi.mock("@/lib/acciones", () => ({
  cambiarEstado: vi.fn(),
  elegirPortada: vi.fn(),
  guardarTextos: vi.fn(),
}));

const textosYoutube = {
  titulos: ["Título recomendado", "Título alternativo"],
  descripcion: "Primera línea\n\nÚltima línea",
  etiquetas: ["curso", "ejemplo"],
  texto: null,
  comentario_fijado: "Comentario",
  ajustes: ["Lista: Curso ficticio"],
  video: null,
  notas: "Nota ficticia",
};

const pieza: PiezaVista = {
  id: "leccion",
  tipo: "leccion",
  titulo: "Lección preparada",
  video: null,
  duracion: "8:57",
  fecha_propuesta: "2026-11-16T20:00",
  portadas: ["cursos/ficticio/portada-a.jpg", "cursos/ficticio/portada-b.jpg"],
  portada_elegida: "cursos/ficticio/portada-b.jpg",
  redes: [
    {
      red: "youtube",
      textos: textosYoutube,
      estado: { estado: "pendiente", fecha: null, url: null },
    },
    {
      red: "instagram",
      textos: { ...textosYoutube, titulos: [], descripcion: null, texto: "Instagram" },
      estado: { estado: "pendiente", fecha: null, url: null },
    },
    {
      red: "tiktok",
      textos: null,
      estado: { estado: "pendiente", fecha: null, url: null },
    },
    {
      red: "linkedin",
      textos: null,
      estado: { estado: "pendiente", fecha: null, url: null },
    },
  ],
};

const vista: VistaPublicacion = {
  curso: "curso-ficticio",
  numero: 4,
  piezas: [
    pieza,
    {
      ...pieza,
      id: "short-1",
      tipo: "short",
      titulo: "Short preparado",
      duracion: "0:42",
      redes: pieza.redes.map((red) => ({ ...red, textos: null })),
    },
  ],
  despues_de_publicar: ["Comprobar un dato ficticio"],
  notas: null,
  error: null,
  guia: null,
  aviso: null,
};

describe("pestaña Publicar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cambiarEstado).mockResolvedValue({ ok: true, vista });
    vi.mocked(elegirPortada).mockResolvedValue({ ok: true, vista });
    vi.mocked(guardarTextos).mockResolvedValue({ ok: true, vista });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("elige la pieza y la red indicadas por la URL", () => {
    render(
      <PublicarLeccion
        vista={vista}
        piezaSeleccionada="leccion"
        redSeleccionada="instagram"
      />,
    );

    expect(screen.getByRole("link", { name: /Lección preparada/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("tab", { name: "Instagram" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Instagram", { selector: "p" })).toBeInTheDocument();
  });

  it("usa la primera pieza cuando ?pieza= no es válida", () => {
    render(
      <PublicarLeccion
        vista={vista}
        piezaSeleccionada="pieza-inexistente"
      />,
    );

    expect(screen.getByRole("link", { name: /Lección preparada/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("usa la primera red con textos cuando ?red= no es válida", () => {
    render(
      <PublicarLeccion
        vista={vista}
        piezaSeleccionada="leccion"
        redSeleccionada="red-inexistente"
      />,
    );

    expect(screen.getByRole("tab", { name: "YouTube" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("muestra los campos no vacíos con independencia de la red", () => {
    const descripcionInstagram = "Descripción preparada para Instagram";
    const textoYoutube = "Texto preparado para YouTube";
    const { rerender } = render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="instagram"
        textos={{
          ...textosYoutube,
          titulos: [],
          descripcion: descripcionInstagram,
          texto: "Texto de Instagram",
        }}
        fechaPropuesta={null}
      />,
    );

    expect(screen.getByText(descripcionInstagram)).toBeInTheDocument();
    expect(screen.queryByText(`${descripcionInstagram.length}/5000`)).not.toBeInTheDocument();

    rerender(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={{ ...textosYoutube, texto: textoYoutube }}
        fechaPropuesta={null}
      />,
    );

    expect(screen.getByText(textoYoutube)).toBeInTheDocument();
    expect(screen.queryByText(`${textoYoutube.length}/2200`)).not.toBeInTheDocument();
  });

  it("copia el texto exacto, incluidos los saltos de línea", async () => {
    const escribir = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: escribir },
    });
    render(<BotonCopiar texto={textosYoutube.descripcion} />);

    await userEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(escribir).toHaveBeenCalledWith("Primera línea\n\nÚltima línea");
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });

  it("vuelve de Copiado a Copiar a los 2 segundos", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<BotonCopiar texto="Texto ficticio" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    });
    expect(screen.getByRole("button", { name: "Copiado" })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("muestra el error de copia y vuelve a Copiar a los 2 segundos", async () => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("sin permiso")) },
    });
    render(<BotonCopiar texto="Texto ficticio" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copiar" }));
    });
    expect(
      screen.getByRole("button", { name: "No se pudo copiar" }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));

    expect(screen.getByRole("button", { name: "Copiar" })).toBeInTheDocument();
  });

  it("pone en rojo el contador de un título de YouTube que pasa de 100", () => {
    render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={{ ...textosYoutube, titulos: ["a".repeat(101)] }}
        fechaPropuesta={null}
      />,
    );

    expect(screen.getByText("101/100")).toHaveClass("text-red-400");
  });

  it("marca la portada elegida con aria-pressed y su distintivo", () => {
    render(
      <ElegirPortada
        curso="curso-ficticio"
        numero={4}
        pieza={pieza}
      />,
    );

    const elegida = screen.getByRole("button", { name: /Portada 2/ });
    expect(elegida).toHaveAttribute("aria-pressed", "true");
    expect(within(elegida).getByText("✓ Elegida")).toBeInTheDocument();
  });

  it("envía curso, número, pieza y ruta al elegir una portada", async () => {
    render(<ElegirPortada curso="curso-ficticio" numero={4} pieza={pieza} />);

    await userEvent.click(screen.getByRole("button", { name: /Portada 1/ }));

    await waitFor(() => {
      expect(elegirPortada).toHaveBeenCalledWith(
        "curso-ficticio",
        4,
        "leccion",
        "cursos/ficticio/portada-a.jpg",
      );
    });
  });

  it("muestra el error devuelto al elegir una portada", async () => {
    vi.mocked(elegirPortada).mockResolvedValueOnce({
      ok: false,
      mensaje: "No se ha podido elegir la portada",
    });
    render(<ElegirPortada curso="curso-ficticio" numero={4} pieza={pieza} />);

    await userEvent.click(screen.getByRole("button", { name: /Portada 1/ }));

    expect(
      await screen.findByRole("alert", { name: "" }),
    ).toHaveTextContent("No se ha podido elegir la portada");
  });

  it("avisa cuando no hay textos de publicacion.json y mantiene portada y estado", () => {
    const sinJson: VistaPublicacion = {
      ...vista,
      piezas: [
        {
          ...pieza,
          redes: pieza.redes.map((red) => ({ ...red, textos: null })),
        },
      ],
      despues_de_publicar: [],
    };
    render(<PublicarLeccion vista={sinJson} />);

    expect(
      screen.getByText("Esta lección todavía no tiene textos de publicación"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Portada/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Estado" })).toBeInTheDocument();
  });

  it("no repite el aviso de textos cuando la lección no tiene piezas", () => {
    render(<PublicarLeccion vista={{ ...vista, piezas: [] }} />);

    expect(
      screen.queryByText("Esta lección todavía no tiene textos de publicación"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Esta lección todavía no tiene piezas para publicar."),
    ).toBeInTheDocument();
  });

  it("marca como publicado con la URL opcional", async () => {
    render(
      <EstadoPublicacion
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        nombreRed="YouTube"
        estado={{ estado: "pendiente", fecha: null, url: null }}
        fechaPropuesta={null}
      />,
    );
    fireEvent.change(screen.getByLabelText("URL de la publicación (opcional)"), {
      target: { value: "https://youtu.be/abc" },
    });

    await userEvent.click(
      screen.getByRole("button", { name: "✓ Marcar como publicado en YouTube" }),
    );

    await waitFor(() => {
      expect(cambiarEstado).toHaveBeenCalledWith(
        "curso-ficticio",
        4,
        "leccion",
        "youtube",
        { estado: "publicado", fecha: null, url: "https://youtu.be/abc" },
      );
    });
  });

  it("reinicia fecha y URL con el estado autoritativo tras una acción correcta", async () => {
    const estadoProgramado = {
      estado: "programado" as const,
      fecha: "2026-11-18T21:30",
      url: null,
    };
    vi.mocked(cambiarEstado).mockResolvedValueOnce({
      ok: true,
      vista: {
        ...vista,
        piezas: [
          {
            ...pieza,
            redes: pieza.redes.map((red) =>
              red.red === "youtube" ? { ...red, estado: estadoProgramado } : red,
            ),
          },
        ],
      },
    });
    render(
      <EstadoPublicacion
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        nombreRed="YouTube"
        estado={{ estado: "pendiente", fecha: null, url: null }}
        fechaPropuesta={null}
      />,
    );
    fireEvent.change(screen.getByLabelText("Fecha y hora local"), {
      target: { value: "2026-11-17T20:00" },
    });
    fireEvent.change(screen.getByLabelText("URL de la publicación (opcional)"), {
      target: { value: "https://youtu.be/valor-anterior" },
    });

    await userEvent.click(screen.getByRole("button", { name: "📅 Programar" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Fecha y hora local")).toHaveValue(
        "2026-11-18T21:30",
      );
      expect(screen.getByLabelText("URL de la publicación (opcional)")).toHaveValue("");
    });
  });

  it("da contexto accesible a cada botón de copia", () => {
    render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={textosYoutube}
        fechaPropuesta={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Copiar el título 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar la descripción" })).toBeInTheDocument();
  });

  it("rechaza en el cliente una URL no permitida", async () => {
    render(
      <EstadoPublicacion
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        nombreRed="YouTube"
        estado={{ estado: "pendiente", fecha: null, url: null }}
        fechaPropuesta={null}
      />,
    );
    fireEvent.change(screen.getByLabelText("URL de la publicación (opcional)"), {
      target: { value: "https://youtube.com.evil.example/video" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "✓ Marcar como publicado en YouTube" }),
    );

    expect(screen.getByText("La URL de publicación no está permitida")).toBeInTheDocument();
    expect(cambiarEstado).not.toHaveBeenCalled();
  });

});
