import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ListaPiezas, VistaVideoFinal } from "@/components/ListaPiezas";
import type { Pieza, PiezaVista } from "@/lib/tipos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

const pieza: Pieza = {
  id: "pieza-falsa",
  tipo: "short",
  titulo: "Pieza de prueba",
  video: null,
  portadas: ["cursos/falso/vertical.jpg"],
};

const short: Pieza = {
  id: "short-1",
  tipo: "short",
  titulo: "Short 1 · Título ficticio",
  video: "cursos/falso/publicar/short-1-ficticio.mp4",
  portadas: [
    "cursos/falso/portada-a.jpg",
    "cursos/falso/portada-b.jpg",
    "cursos/falso/portada-c.jpg",
  ],
};

const reel: Pieza = {
  id: "reel-salida",
  tipo: "reel",
  titulo: "Reel de salida · Título ficticio",
  video: null,
  portadas: [],
};

function detalle(
  base: Pieza,
  cambios: Partial<PiezaVista> = {},
): PiezaVista {
  return {
    ...base,
    duracion: null,
    fecha_propuesta: null,
    portada_elegida: null,
    redes: [],
    ...cambios,
  };
}

describe("ListaPiezas", () => {
  it("muestra completas las portadas verticales de shorts y reels", () => {
    render(<ListaPiezas piezas={[pieza]} />);

    expect(screen.getByRole("img")).toHaveClass("aspect-[9/16]", "object-contain");
    expect(screen.getByRole("img")).not.toHaveClass("object-cover");
  });

  it("rotula cada tarjeta con el tipo, el título y la duración", () => {
    render(
      <ListaPiezas
        piezas={[short, reel]}
        detalles={[detalle(short, { duracion: "0:42" }), detalle(reel)]}
      />,
    );

    const tarjetaShort = screen.getByRole("article", { name: short.titulo });
    expect(within(tarjetaShort).getByText("Short")).toBeInTheDocument();
    expect(
      within(tarjetaShort).getByRole("heading", { name: short.titulo }),
    ).toBeInTheDocument();
    expect(within(tarjetaShort).getByText("0:42")).toBeInTheDocument();

    const tarjetaReel = screen.getByRole("article", { name: reel.titulo });
    expect(within(tarjetaReel).getByText("Reel de salida")).toBeInTheDocument();
    expect(within(tarjetaReel).getByText("Duración pendiente")).toBeInTheDocument();
  });

  it("separa el vídeo, con su archivo, de las portadas propuestas", () => {
    render(<ListaPiezas piezas={[short]} detalles={[detalle(short)]} />);

    const tarjeta = screen.getByRole("article", { name: short.titulo });
    const video = within(tarjeta).getByRole("region", { name: "Vídeo" });
    expect(within(video).getByLabelText(`Vídeo de ${short.titulo}`)).toBeInTheDocument();
    expect(within(video).getByText("short-1-ficticio.mp4")).toBeInTheDocument();

    const portadas = within(tarjeta).getByRole("region", {
      name: "Portadas propuestas (3)",
    });
    expect(within(portadas).getAllByRole("img")).toHaveLength(3);
  });

  it("marca la portada elegida", () => {
    render(
      <ListaPiezas
        piezas={[short]}
        detalles={[detalle(short, { portada_elegida: "cursos/falso/portada-b.jpg" })]}
      />,
    );

    const elegida = screen.getByRole("img", { name: /Portada 2/ }).closest("figure");
    expect(within(elegida!).getByText("✓ Elegida")).toBeInTheDocument();
    expect(screen.getAllByText("✓ Elegida")).toHaveLength(1);
    expect(screen.queryByText(/Sin elegir/)).not.toBeInTheDocument();
  });

  it("usa las portadas de la vista de publicación cuando las hay", () => {
    render(
      <ListaPiezas
        piezas={[{ ...short, portadas: ["cursos/falso/portada-a.jpg"] }]}
        detalles={[
          detalle(short, {
            portadas: ["cursos/falso/portada-a.jpg", "cursos/falso/candidata.jpg"],
            portada_elegida: "cursos/falso/candidata.jpg",
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Portadas propuestas (2)" }),
    ).toBeInTheDocument();
    const elegida = screen.getByRole("img", { name: /Portada 2/ }).closest("figure");
    expect(within(elegida!).getByText("✓ Elegida")).toBeInTheDocument();
  });

  it("sin portada elegida invita a elegirla en Publicar", () => {
    render(<ListaPiezas piezas={[short]} detalles={[detalle(short)]} />);

    expect(screen.queryByText("✓ Elegida")).not.toBeInTheDocument();
    expect(screen.getByText(/Sin elegir ·/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elegir en Publicar" })).toHaveAttribute(
      "href",
      "?pestana=publicar&pieza=short-1",
    );
  });

  it("sin datos de publicación enlaza a Publicar para elegir la portada", () => {
    render(<ListaPiezas piezas={[short]} detalles={null} />);

    expect(screen.queryByText(/Sin elegir/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Elegir en Publicar" })).toHaveAttribute(
      "href",
      "?pestana=publicar&pieza=short-1",
    );
    expect(screen.getByText("Duración pendiente")).toBeInTheDocument();
  });

  it("dice que el vídeo está pendiente cuando todavía no hay archivo", () => {
    render(<ListaPiezas piezas={[reel]} detalles={[detalle(reel)]} />);

    const video = screen.getByRole("region", { name: "Vídeo" });
    expect(within(video).getByText("Vídeo pendiente")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Portadas propuestas (0)" }),
    ).toHaveTextContent("Sin portadas todavía.");
  });

  it("muestra un fotograma de la previa desde el segundo uno", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={null}
        previas={["previa.mp4"]}
        acciones={null}
      />,
    );

    expect(screen.getByLabelText("Previa seleccionada")).toHaveAttribute(
      "src",
      expect.stringMatching(/#t=1$/),
    );
  });

  it("mantiene las portadas de la lección en 16:9", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={{ ...pieza, tipo: "leccion", video: "final.mp4" }}
        previas={[]}
        acciones={null}
      />,
    );

    expect(screen.getByLabelText("Vídeo final de la lección")).toHaveClass("aspect-video");
  });

  it("rotula las previas con el número de su nombre, también con huecos", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={null}
        previas={["ruta/previa-v1.mp4", "ruta/previa-v3.mp4"]}
        acciones={null}
      />,
    );

    const grupo = screen.getByLabelText("Elegir una previa");
    expect(
      Array.from(grupo.querySelectorAll("button")).map((boton) => boton.textContent),
    ).toEqual(["Previa 3", "Previa 1"]);
    expect(screen.getByRole("button", { name: "Previa 3" })).toHaveAttribute("aria-pressed", "true");
  });

  it("distingue con su etiqueta las previas que comparten número", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={null}
        previas={[
          "ruta/previa-v13.mp4",
          "ruta/previa-v13-camaras-reales.mp4",
        ]}
        acciones={null}
      />,
    );

    expect(screen.getByRole("button", { name: "Previa 13" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previa 13 · camaras reales" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previa 13" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("permite envolver los botones sin ensanchar la página", () => {
    render(
      <VistaVideoFinal
        curso="curso-ficticio"
        numero={4}
        pieza={null}
        previas={["ruta/previa-v10-estudio-720p.mp4"]}
        acciones={null}
      />,
    );

    expect(screen.getByLabelText("Elegir una previa")).toHaveClass(
      "max-w-full",
      "flex-wrap",
    );
  });

  it("tras un render nuevo pasa a la última previa", async () => {
    const props = {
      curso: "curso-ficticio",
      numero: 4,
      pieza: null,
      acciones: null,
    };
    const { rerender } = render(
      <VistaVideoFinal {...props} previas={["ruta/previa-v1.mp4", "ruta/previa-v2.mp4"]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Previa 1" }));
    expect(screen.getByLabelText("Previa seleccionada")).toHaveAttribute(
      "src",
      expect.stringContaining("previa-v1.mp4"),
    );

    rerender(
      <VistaVideoFinal
        {...props}
        previas={["ruta/previa-v1.mp4", "ruta/previa-v2.mp4", "ruta/previa-v3.mp4"]}
      />,
    );

    expect(screen.getByLabelText("Previa seleccionada")).toHaveAttribute(
      "src",
      expect.stringContaining("previa-v3.mp4"),
    );
    expect(screen.getByRole("button", { name: "Previa 3" })).toHaveAttribute("aria-pressed", "true");
  });

  it("mantiene la previa elegida si un refresco no trae previas nuevas", async () => {
    const props = {
      curso: "curso-ficticio",
      numero: 4,
      pieza: null,
      acciones: null,
    };
    const { rerender } = render(
      <VistaVideoFinal {...props} previas={["ruta/previa-v1.mp4", "ruta/previa-v2.mp4"]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Previa 1" }));

    rerender(
      <VistaVideoFinal {...props} previas={["ruta/previa-v1.mp4", "ruta/previa-v2.mp4"]} />,
    );

    expect(screen.getByRole("button", { name: "Previa 1" })).toHaveAttribute("aria-pressed", "true");
  });
});
