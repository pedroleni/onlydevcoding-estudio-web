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

  it("al pulsar Instagram oculta YouTube y muestra solo el panel activo", async () => {
    render(
      <PublicarLeccion
        vista={vista}
        piezaSeleccionada="leccion"
        redSeleccionada="youtube"
      />,
    );

    expect(
      screen.getByRole("tabpanel", { name: "YouTube" }),
    ).toBeVisible();

    const pestanaInstagram = screen.getByRole("tab", { name: "Instagram" });
    pestanaInstagram.addEventListener("click", (evento) => evento.preventDefault());
    await userEvent.click(pestanaInstagram);

    expect(
      screen.queryByRole("tabpanel", { name: "YouTube", hidden: true }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("tabpanel", { name: "Instagram" }),
    ).toBeVisible();
  });

  it("no deja montado ningún panel de una red inactiva", async () => {
    const conTodasLasRedes: VistaPublicacion = {
      ...vista,
      piezas: [
        {
          ...pieza,
          redes: pieza.redes.map((red) => ({ ...red, textos: textosYoutube })),
        },
      ],
    };
    render(
      <PublicarLeccion
        vista={conTodasLasRedes}
        piezaSeleccionada="leccion"
        redSeleccionada="youtube"
      />,
    );

    const pestanaTikTok = screen.getByRole("tab", { name: "TikTok" });
    pestanaTikTok.addEventListener("click", (evento) => evento.preventDefault());
    await userEvent.click(pestanaTikTok);

    for (const nombre of ["YouTube", "Instagram", "LinkedIn"]) {
      expect(
        screen.queryByRole("tabpanel", { name: nombre, hidden: true }),
      ).not.toBeInTheDocument();
    }
    expect(screen.getByRole("tabpanel", { name: "TikTok" })).toBeVisible();
  });

  it("muestra los textos de la pieza nueva al cambiar de pieza", () => {
    const textoLeccion = "Texto de LinkedIn de la lección ficticia";
    const textoShort = "Texto de LinkedIn del short ficticio";
    const conTextosDistintos: VistaPublicacion = {
      ...vista,
      piezas: vista.piezas.map((piezaVista) => ({
        ...piezaVista,
        redes: piezaVista.redes.map((redVista) =>
          redVista.red === "linkedin"
            ? {
                ...redVista,
                textos: {
                  ...textosYoutube,
                  titulos: [],
                  descripcion: null,
                  texto:
                    piezaVista.id === "leccion" ? textoLeccion : textoShort,
                },
              }
            : redVista,
        ),
      })),
    };
    const { rerender } = render(
      <PublicarLeccion
        vista={conTextosDistintos}
        piezaSeleccionada="leccion"
        redSeleccionada="linkedin"
      />,
    );

    expect(screen.getByText(textoLeccion)).toBeInTheDocument();

    rerender(
      <PublicarLeccion
        vista={conTextosDistintos}
        piezaSeleccionada="short-1"
        redSeleccionada="linkedin"
      />,
    );

    expect(screen.getByText(textoShort)).toBeInTheDocument();
    expect(screen.queryByText(textoLeccion)).not.toBeInTheDocument();
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

  it("avisa cuando no hay textos de publicacion.json y mantiene la portada", () => {
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
    expect(
      screen.getAllByRole("tab").map((pestana) => pestana.textContent),
    ).toEqual(["YouTube", "LinkedIn"]);
    expect(
      screen.queryByText("Esta pieza no tiene redes de publicación."),
    ).not.toBeInTheDocument();
  });

  it("enseña solo las redes con textos o con estado y avisa de las que faltan", () => {
    const conProgramado: VistaPublicacion = {
      ...vista,
      piezas: [
        {
          ...pieza,
          redes: pieza.redes.map((red) =>
            red.red === "linkedin"
              ? {
                  ...red,
                  estado: { estado: "programado", fecha: "2026-11-20T20:00", url: null },
                }
              : red,
          ),
        },
      ],
    };
    render(<PublicarLeccion vista={conProgramado} piezaSeleccionada="leccion" />);

    expect(
      screen.getAllByRole("tab").map((pestana) => pestana.textContent),
    ).toEqual(["YouTube", "Instagram", "LinkedIn"]);
    expect(screen.queryByRole("tab", { name: "TikTok" })).not.toBeInTheDocument();
    expect(
      screen.getByText("Esta pieza no se publica en TikTok"),
    ).toBeInTheDocument();
  });

  it("nombra todas las redes que faltan en una sola línea", () => {
    const soloLinkedin: VistaPublicacion = {
      ...vista,
      piezas: [
        {
          ...pieza,
          redes: pieza.redes.map((red) => ({
            ...red,
            textos: red.red === "linkedin" ? textosYoutube : null,
          })),
        },
      ],
    };
    render(<PublicarLeccion vista={soloLinkedin} />);

    expect(screen.getAllByRole("tab").map((pestana) => pestana.textContent)).toEqual([
      "LinkedIn",
    ]);
    expect(screen.getByRole("tab", { name: "LinkedIn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByText("Esta pieza no se publica en YouTube, Instagram ni TikTok"),
    ).toBeInTheDocument();
  });

  it("no pinta la línea de redes ausentes si la pieza está en todas", () => {
    const conTodasLasRedes: VistaPublicacion = {
      ...vista,
      piezas: [
        {
          ...pieza,
          redes: pieza.redes.map((red) => ({ ...red, textos: textosYoutube })),
        },
      ],
    };
    render(<PublicarLeccion vista={conTodasLasRedes} />);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByText(/no se publica en/)).not.toBeInTheDocument();
  });

  it("cae en la primera red disponible si ?red= apunta a una red sin textos", () => {
    render(
      <PublicarLeccion
        vista={vista}
        piezaSeleccionada="leccion"
        redSeleccionada="tiktok"
      />,
    );

    expect(screen.queryByRole("tab", { name: "TikTok" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "YouTube" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tabpanel", { name: "YouTube" })).toBeVisible();
  });

  it("una lección sin textos ni estado muestra YouTube y LinkedIn con el panel Estado", () => {
    const sinNada: VistaPublicacion = {
      ...vista,
      piezas: [
        { ...pieza, redes: pieza.redes.map((red) => ({ ...red, textos: null })) },
      ],
    };
    render(<PublicarLeccion vista={sinNada} piezaSeleccionada="leccion" />);

    expect(
      screen.getAllByRole("tab").map((pestana) => pestana.textContent),
    ).toEqual(["YouTube", "LinkedIn"]);
    expect(screen.getByRole("tabpanel", { name: "YouTube" })).toBeVisible();
    expect(screen.getByRole("heading", { name: /Estado/ })).toBeInTheDocument();
    expect(screen.queryByText(/Esta pieza no se publica en/)).not.toBeInTheDocument();
  });

  it("un short sin textos ni estado muestra YouTube, Instagram y TikTok", () => {
    render(<PublicarLeccion vista={vista} piezaSeleccionada="short-1" />);

    expect(
      screen.getAllByRole("tab").map((pestana) => pestana.textContent),
    ).toEqual(["YouTube", "Instagram", "TikTok"]);
    expect(screen.getByRole("heading", { name: /Estado/ })).toBeInTheDocument();
    expect(screen.queryByText(/Esta pieza no se publica en/)).not.toBeInTheDocument();
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

  it("muestra vista.error sin romper el resto de la página", () => {
    render(
      <PublicarLeccion
        vista={{ ...vista, error: "No se pudo leer una parte de publicación" }}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No se pudo leer una parte de publicación",
    );
    expect(screen.getByRole("heading", { name: /Portada/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Estado" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Después de publicar" })).toBeInTheDocument();
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

  it("conserva la fecha existente al volver a marcar un estado publicado", async () => {
    const fechaPublicada = "2026-11-16T20:00";
    render(
      <EstadoPublicacion
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        nombreRed="YouTube"
        estado={{ estado: "publicado", fecha: fechaPublicada, url: null }}
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
        { estado: "publicado", fecha: fechaPublicada, url: "https://youtu.be/abc" },
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
