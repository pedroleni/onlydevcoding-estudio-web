import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditorTextosRed } from "@/components/publicar/EditorTextosRed";
import { PanelTextosRed } from "@/components/publicar/TextosRed";
import { guardarTextos } from "@/lib/acciones";
import { LIMITES_PUBLICACION, limiteTextoRed } from "@/lib/limites";
import type { TextosRed, VistaPublicacion } from "@/lib/tipos";

vi.mock("@/lib/acciones", () => ({
  guardarTextos: vi.fn(),
}));

const textos: TextosRed = {
  titulos: ["Título inicial"],
  descripcion: "Descripción inicial",
  etiquetas: ["uno", "dos"],
  texto: "Texto inicial",
  comentario_fijado: "Comentario inicial",
  ajustes: ["Ajuste inicial"],
  video: "videos/pieza.mp4",
  notas: "Notas iniciales",
};

const vista: VistaPublicacion = {
  curso: "curso-ficticio",
  numero: 4,
  piezas: [],
  despues_de_publicar: [],
  notas: null,
  error: null,
  guia: null,
  aviso: null,
};

const props = {
  curso: "curso-ficticio",
  numero: 4,
  pieza: "leccion",
  red: "youtube" as const,
  textos,
  onCancelar: vi.fn(),
  onGuardado: vi.fn(),
};

describe("EditorTextosRed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(guardarTextos).mockResolvedValue({ ok: true, vista });
  });

  it("convierte los campos a TextosEditables, quita vacíos y no envía el vídeo", async () => {
    render(<EditorTextosRed {...props} />);

    fireEvent.change(screen.getByLabelText("Títulos, uno por línea"), {
      target: { value: "  Primero  \n   \n Segundo " },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByLabelText("Etiquetas separadas por comas"), {
      target: { value: " alfa, , beta ,  " },
    });
    fireEvent.change(screen.getByLabelText("Ajustes, uno por línea"), {
      target: { value: "  Público  \n\n Lista " },
    });
    fireEvent.change(screen.getByLabelText("Texto"), {
      target: { value: "   " },
    });

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(guardarTextos).toHaveBeenCalledWith(
        { curso: "curso-ficticio", numero: 4, pieza: "leccion", red: "youtube" },
        {
          titulos: ["Primero", "Segundo"],
          descripcion: null,
          etiquetas: ["alfa", "beta"],
          texto: null,
          comentario_fijado: "Comentario inicial",
          ajustes: ["Público", "Lista"],
          notas: "Notas iniciales",
        },
      );
    });
  });

  it("desactiva Guardar mientras los textos preparados no cambian", () => {
    render(<EditorTextosRed {...props} />);

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Títulos, uno por línea"), {
      target: { value: "  Título inicial  \n\n" },
    });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Descripción modificada" },
    });
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it.each([
    ["Títulos, uno por línea", "a".repeat(LIMITES_PUBLICACION.tituloYoutube + 1)],
    ["Descripción", "a".repeat(LIMITES_PUBLICACION.descripcionYoutube + 1)],
    ["Etiquetas separadas por comas", "a".repeat(LIMITES_PUBLICACION.etiquetasYoutube + 1)],
    ["Comentario fijado", "a".repeat(LIMITES_PUBLICACION.comentarioFijado + 1)],
    ["Notas", "a".repeat(LIMITES_PUBLICACION.notas + 1)],
    ["Ajustes, uno por línea", "a".repeat(LIMITES_PUBLICACION.caracteresPorLinea + 1)],
    ["Ajustes, uno por línea", Array.from({ length: LIMITES_PUBLICACION.maximoLineas + 1 }, () => "a").join("\n")],
  ])("desactiva Guardar si %s supera su límite", (etiqueta, valor) => {
    render(<EditorTextosRed {...props} />);

    fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it.each(["instagram", "tiktok", "linkedin"] as const)(
    "muestra el contador y desactiva Guardar si el texto de %s supera su límite",
    (red) => {
      const limite = limiteTextoRed(red);
      expect(limite).not.toBeNull();
      if (limite === null) return;

      render(<EditorTextosRed {...props} red={red} />);

      expect(
        screen.getByText(`${textos.texto?.length}/${limite}`),
      ).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Texto"), {
        target: { value: "a".repeat(limite + 1) },
      });

      expect(screen.getByText(`${limite + 1}/${limite}`)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
    },
  );

  it("no pinta contadores por línea para títulos ni ajustes vacíos", () => {
    render(
      <EditorTextosRed
        {...props}
        textos={{ ...textos, titulos: [], ajustes: [] }}
      />,
    );

    expect(
      screen.queryByText(`0/${LIMITES_PUBLICACION.tituloYoutube}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`0/${LIMITES_PUBLICACION.caracteresPorLinea}`),
    ).not.toBeInTheDocument();
  });

  it("conserva el texto editado si la acción devuelve un error", async () => {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: false,
      mensaje: "No se han podido guardar los textos",
    });
    render(<EditorTextosRed {...props} />);
    const descripcion = screen.getByLabelText("Descripción");
    fireEvent.change(descripcion, { target: { value: "Texto todavía sin guardar" } });

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se han podido guardar los textos",
    );
    expect(descripcion).toHaveValue("Texto todavía sin guardar");
  });

  it("muestra el aviso de la acción al volver a la vista", async () => {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: true,
      vista,
      aviso: "Guardado, pero no se pudo regenerar la guía",
    });
    render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={textos}
        fechaPropuesta={null}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Descripción modificada" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Guardado, pero no se pudo regenerar la guía"),
    ).toBeInTheDocument();
  });

  it("Cancelar descarta los cambios", async () => {
    render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={textos}
        fechaPropuesta={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Cambio descartado" },
    });

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(screen.getByLabelText("Descripción")).toHaveValue("Descripción inicial");
  });

  it("muestra la confirmación normal cuando guarda sin aviso", async () => {
    render(
      <PanelTextosRed
        curso="curso-ficticio"
        numero={4}
        pieza="leccion"
        red="youtube"
        textos={textos}
        fechaPropuesta={null}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Descripción modificada" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(
      await screen.findByText("Guardado. Guía del móvil regenerada"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
  });

  it("envía intactos los textos con espacios, vallas y líneas en blanco exteriores", async () => {
    const valor = "  \nAntes\n\n```\ncódigo\n```\n\nDespués\n  ";
    render(<EditorTextosRed {...props} />);
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: valor },
    });
    fireEvent.change(screen.getByLabelText("Texto"), {
      target: { value: valor },
    });
    fireEvent.change(screen.getByLabelText("Comentario fijado"), {
      target: { value: valor },
    });
    fireEvent.change(screen.getByLabelText("Notas"), {
      target: { value: valor },
    });

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(guardarTextos).toHaveBeenCalledWith(
        { curso: "curso-ficticio", numero: 4, pieza: "leccion", red: "youtube" },
        expect.objectContaining({
          descripcion: valor,
          texto: valor,
          comentario_fijado: valor,
          notas: valor,
        }),
      );
    });
  });
});
