import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { ElegirPortada } from "@/components/publicar/ElegirPortada";
import {
  EstadoPublicacion,
  errorUrlPublicacion,
} from "@/components/publicar/EstadoPublicacion";
import { PublicarLeccion } from "@/components/publicar/PublicarLeccion";
import { TextosPublicacionRed } from "@/components/publicar/TextosRed";
import { cambiarEstado, elegirPortada } from "@/lib/acciones";
import type { PiezaVista, VistaPublicacion } from "@/lib/tipos";

vi.mock("@/lib/acciones", () => ({
  cambiarEstado: vi.fn(),
  elegirPortada: vi.fn(),
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

  it("pone en rojo el contador de un título de YouTube que pasa de 100", () => {
    render(
      <TextosPublicacionRed
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

  it.each([
    "https://youtube.com",
    "https://www.youtube.com/video",
    "https://youtu.be/abc",
    "https://instagram.com/p/abc",
    "https://www.instagram.com/p/abc",
    "https://tiktok.com/video/1",
    "https://www.tiktok.com/video/1",
    "https://linkedin.com/posts/abc",
    "https://www.linkedin.com/posts/abc",
  ])("acepta el host de publicación permitido %s", (url) => {
    expect(errorUrlPublicacion(url)).toBeNull();
  });

  it.each([
    "http://youtube.com/video",
    "https://youtube.com.evil.example/video",
    ["https://usuario", "youtube.com/video"].join("@"),
    "https://youtube.com:443/video",
    "https://youtube.com:/video",
    "https:///youtube.com/video",
    "https://youtube.com\\ruta",
    " https://youtu.be/video",
  ])("rechaza la variante de URL no permitida %s", (url) => {
    expect(errorUrlPublicacion(url)).not.toBeNull();
  });
});
