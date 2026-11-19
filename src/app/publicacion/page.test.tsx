import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    obtenerCursos: vi.fn(),
    obtenerLecciones: vi.fn(),
    obtenerPublicacion: vi.fn(),
  };
});

import { ContenidoPublicacion } from "@/app/publicacion/page";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLecciones,
  obtenerPublicacion,
} from "@/lib/api";
import type {
  EstadoLeccion,
  EstadoRed,
  LeccionResumen,
  PiezaVista,
  RedVista,
  VistaPublicacion,
} from "@/lib/tipos";

const TEXTOS = {
  titulos: ["t"],
  descripcion: null,
  etiquetas: [],
  texto: null,
  comentario_fijado: null,
  ajustes: [],
  video: null,
  notas: null,
};

function red(
  id: RedVista["red"],
  estado: EstadoRed["estado"] = "pendiente",
  url: string | null = null,
): RedVista {
  return {
    red: id,
    textos: TEXTOS,
    estado: {
      estado,
      fecha: estado === "pendiente" ? null : "2026-11-18T19:43:20+01:00",
      url,
    },
  };
}

function pieza(parcial: Partial<PiezaVista>): PiezaVista {
  return {
    id: "leccion",
    tipo: "leccion",
    titulo: "Lección completa",
    video: "publicar/leccion.mp4",
    duracion: null,
    fecha_propuesta: null,
    portadas: [],
    portada_elegida: null,
    redes: [],
    ...parcial,
  };
}

function vista(numero: number, piezas: PiezaVista[]): VistaPublicacion {
  return {
    curso: "react",
    numero,
    piezas,
    despues_de_publicar: [],
    notas: null,
    error: null,
    guia: null,
    aviso: null,
  };
}

function estado(parcial: Partial<EstadoLeccion>): EstadoLeccion {
  return {
    guion: true,
    voz: { hechas: 10, total: 10 },
    camara: { hechas: 3, total: 3 },
    video_final: true,
    miniatura: null,
    previa: null,
    publicado: {},
    ...parcial,
  };
}

function leccion(numero: number, titulo: string, e: EstadoLeccion): LeccionResumen {
  return { curso: "react", numero, slug: `l${numero}`, titulo, estado: e };
}

const VISTAS: Record<number, VistaPublicacion | null> = {
  1: vista(1, [
    pieza({
      redes: [
        red("youtube", "publicado", "https://youtu.be/abc"),
        red("linkedin"),
      ],
    }),
    pieza({
      id: "short-2",
      tipo: "short",
      titulo: "Short 2 · Con un taxi",
      redes: [
        red("youtube", "programado"),
        red("instagram", "publicado", "javascript:alert(1)"),
        red("tiktok", "publicado"),
      ],
    }),
  ]),
  2: vista(2, [
    pieza({ redes: [red("youtube", "publicado", "https://youtu.be/def")] }),
  ]),
  3: vista(3, [pieza({ video: null, redes: [] })]),
};

describe("página de publicación", () => {
  beforeEach(() => {
    vi.mocked(obtenerCursos).mockResolvedValue([
      { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 3, en_disco: true },
    ]);
    vi.mocked(obtenerLecciones).mockResolvedValue([
      leccion(1, "¿Qué problema resuelve React?", estado({})),
      leccion(2, "Crear un proyecto con Vite", estado({})),
      leccion(
        3,
        "Tu primer componente",
        estado({ voz: { hechas: 0, total: 10 }, camara: { hechas: 0, total: 3 }, video_final: false }),
      ),
    ]);
    vi.mocked(obtenerPublicacion).mockImplementation(async (_curso, numero) => VISTAS[numero] ?? null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("enseña el avance global del curso con lo que queda para acabarlo", async () => {
    render(await ContenidoPublicacion());

    const global = screen.getByRole("region", { name: "Visión global de React" });
    // L1: (3 + 3/5)/4 = 90 %, L2: 100 %, L3: 0 % → media 63 %
    expect(within(global).getByText("63 %")).toBeInTheDocument();
    expect(within(global).getByText(/queda el 37 %/)).toBeInTheDocument();
    expect(within(global).getByText("1 de 3 lecciones terminada del todo")).toBeInTheDocument();
    expect(within(global).getByRole("progressbar", { name: "Avance del curso" })).toHaveAttribute(
      "aria-valuenow",
      "63",
    );
    const porLeccion = within(global).getByRole("list", { name: "Avance por lección" });
    expect(within(porLeccion).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "0190 %",
      "02100 %",
      "030 %",
    ]);
  });

  it("cuenta lo que queda y lo subido en total y por red", async () => {
    render(await ContenidoPublicacion());

    const cifras = screen.getByRole("list", { name: "Cifras de publicación" });
    expect(within(cifras).getByText("quedan").previousSibling).toHaveTextContent("2");
    expect(within(cifras).getByText("subidas").previousSibling).toHaveTextContent("4");
    expect(within(cifras).getByText("YouTube").previousSibling).toHaveTextContent("1");
    expect(within(cifras).getByText("LinkedIn").previousSibling).toHaveTextContent("1");
    expect(within(cifras).getByText("Instagram").previousSibling).toHaveTextContent("0");
  });

  it("lista lo que queda por lección y pieza, con cada red enlazando a Publicar", async () => {
    render(await ContenidoPublicacion());

    const queda = screen.getByRole("region", { name: "Queda por subir" });
    const bloques = within(queda).getAllByRole("article");
    expect(bloques).toHaveLength(1);
    expect(within(bloques[0]).getByText("2 por subir")).toBeInTheDocument();

    const short = within(bloques[0]).getByRole("listitem", { name: "Short 2 · Con un taxi" });
    expect(within(short).getByRole("link", { name: "📅 YouTube, programado" })).toHaveAttribute(
      "href",
      "/cursos/react/1?pestana=publicar&pieza=short-2&red=youtube",
    );
    expect(within(short).getByRole("link", { name: "✅ Instagram, subido" })).toBeInTheDocument();
    const leccion1 = within(bloques[0]).getByRole("listitem", { name: "Lección completa" });
    const linkedin = within(leccion1).getByRole("link", { name: "⬜ LinkedIn, pendiente, sin vídeo" });
    expect(linkedin).toHaveTextContent("LinkedIn · sin vídeo");
    expect(linkedin).toHaveAttribute(
      "href",
      "/cursos/react/1?pestana=publicar&pieza=leccion&red=linkedin",
    );
    expect(within(queda).getByText("Lección 3: aún sin textos de publicación.")).toBeInTheDocument();
  });

  it("no avisa de vídeo en un LinkedIn que ya tiene su clip", async () => {
    vi.mocked(obtenerPublicacion).mockImplementation(async (_curso, numero) =>
      numero === 1
        ? vista(1, [
            pieza({
              redes: [
                red("youtube", "publicado", "https://youtu.be/abc"),
                { ...red("linkedin"), textos: { ...TEXTOS, video: "cursos/x/4-linkedin/l.mp4" } },
              ],
            }),
          ])
        : (VISTAS[numero] ?? null),
    );

    render(await ContenidoPublicacion());

    const queda = screen.getByRole("region", { name: "Queda por subir" });
    expect(within(queda).getByRole("link", { name: "⬜ LinkedIn, pendiente" })).toBeInTheDocument();
  });

  it("lista lo subido por lección con fecha y enlace solo si la URL es de la red", async () => {
    render(await ContenidoPublicacion());

    const subido = screen.getByRole("region", { name: "Ya subido" });
    expect(within(subido).getByText("3 subidas")).toBeInTheDocument();
    expect(within(subido).getByText("1 subida")).toBeInTheDocument();

    const enlaces = within(subido).getAllByRole("link", { name: /abrir/ });
    expect(enlaces.map((a) => a.getAttribute("href"))).toEqual([
      "https://youtu.be/abc",
      "https://youtu.be/def",
    ]);
    expect(enlaces[0]).toHaveAttribute("target", "_blank");
    expect(enlaces[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(within(subido).getAllByText("sin enlace")).toHaveLength(2);
    expect(within(subido).getAllByText(/mié 18 nov · 19:43/).length).toBeGreaterThan(0);
  });

  it("avisa de las lecciones cuya publicación no se pudo leer", async () => {
    vi.mocked(obtenerPublicacion).mockImplementation(async (_curso, numero) => {
      if (numero === 2) throw new ErrorApi(500);
      return VISTAS[numero] ?? null;
    });

    render(await ContenidoPublicacion());

    expect(screen.getByText("No se pudo leer la publicación de la lección 2.")).toBeInTheDocument();
  });

  it("enseña el aviso de la API si no responde", async () => {
    vi.mocked(obtenerCursos).mockRejectedValue(new ApiNoDisponible());

    render(await ContenidoPublicacion());

    expect(screen.getByRole("alert")).toHaveTextContent("No se puede conectar con la API");
  });
});
