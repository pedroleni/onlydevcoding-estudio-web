import { render, screen, within } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaginaCurso from "@/app/cursos/[curso]/page";
import PaginaLeccion from "@/app/cursos/[curso]/[numero]/page";
import { notFound } from "next/navigation";
import {
  obtenerAcciones,
  obtenerCursos,
  obtenerLeccion,
  obtenerPublicacion,
  obtenerTeleprompter,
} from "@/lib/api";
import type { Leccion, Teleprompter, VistaPublicacion } from "@/lib/tipos";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/acciones-tareas", () => ({
  crearCurso: vi.fn(),
  borrarCurso: vi.fn(),
}));

vi.mock("@/lib/acciones", () => ({
  cambiarEstado: vi.fn(),
  elegirPortada: vi.fn(),
}));

vi.mock("@/lib/acciones-teleprompter", () => ({
  guardarTextos: vi.fn(),
}));

vi.mock("@/components/acciones/BotonAccion", () => ({
  BotonAccion: () => <button>Acción ficticia</button>,
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    obtenerCursos: vi.fn(),
    obtenerLecciones: vi.fn(),
    obtenerLeccion: vi.fn(),
    obtenerPublicacion: vi.fn(),
    obtenerTeleprompter: vi.fn(),
    obtenerAcciones: vi.fn(),
  };
});

const leccion: Leccion = {
  curso: "Curso ficticio",
  numero: 1,
  slug: "leccion-ficticia",
  titulo: "Lección ficticia",
  subtitulo: "",
  escenas: [
    {
      id: "voz-uno",
      modo: "voz",
      tipo: "explicacion",
      titulo: "Primera escena",
      textos: ["Texto ficticio."],
      inicio_s: null,
      duracion_s: null,
    },
    {
      id: "voz-dos",
      modo: "voz",
      tipo: "explicacion",
      titulo: "Segunda escena",
      textos: ["Otro texto ficticio."],
      inicio_s: null,
      duracion_s: null,
    },
  ],
  piezas: [],
  previas: [],
  duracion_s: null,
  montaje: null,
  estado: {
    guion: true,
    voz: { hechas: 1, total: 2 },
    camara: { hechas: 0, total: 0 },
    video_final: false,
    miniatura: null,
    previa: null,
    publicado: {},
  },
};

async function renderizarContenidoLeccion({
  numero = "1",
  pestana,
  pieza,
  red,
}: {
  numero?: string;
  pestana?: string;
  pieza?: string;
  red?: string;
} = {}) {
  const consulta = Object.fromEntries(
    Object.entries({ pestana, pieza, red }).filter(([, valor]) => valor !== undefined),
  );
  const pagina = PaginaLeccion({
    params: Promise.resolve({ curso: "curso-ficticio", numero }),
    searchParams: Promise.resolve(consulta),
  });
  const suspense = (
    pagina as ReactElement<{
      children: ReactElement<{ children: ReactElement<Record<string, unknown>> }>;
    }>
  ).props.children;
  const contenido = suspense.props.children;
  const cargarContenido = contenido.type as (
    props: Record<string, unknown>,
  ) => Promise<ReactNode>;

  return cargarContenido(contenido.props);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(notFound).mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  vi.mocked(obtenerLeccion).mockResolvedValue(leccion);
  vi.mocked(obtenerCursos).mockResolvedValue([
    {
      id: "curso-ficticio",
      nombre: "Curso ficticio",
      carpeta: "curso-ficticio",
      lecciones: 1,
      en_disco: true,
    },
  ]);
  vi.mocked(obtenerPublicacion).mockResolvedValue(null);
  vi.mocked(obtenerTeleprompter).mockResolvedValue(null);
  vi.mocked(obtenerAcciones).mockResolvedValue(null);
});

describe("shell de las páginas dinámicas", () => {
  it("la página de curso no espera params ni datos antes de Suspense", () => {
    const params = new Promise<never>(() => undefined);
    const resultado = PaginaCurso({
      params,
      searchParams: Promise.resolve({}),
    });

    expect(resultado).not.toBeInstanceOf(Promise);
  });

  it("la página de lección no espera params ni datos antes de Suspense", () => {
    const params = new Promise<never>(() => undefined);
    const searchParams = new Promise<never>(() => undefined);
    const resultado = PaginaLeccion({ params, searchParams });

    expect(resultado).not.toBeInstanceOf(Promise);
  });

  it("muestra solo el recuento conocido en grabaciones, sin atribuirlo a escenas", async () => {
    render(await renderizarContenidoLeccion({ pestana: "grabaciones" }));

    const grabaciones = screen.getByRole("tabpanel");
    expect(within(grabaciones).getByText("1/2")).toBeInTheDocument();
    expect(within(grabaciones).getByText("voz-uno")).toBeInTheDocument();
    expect(within(grabaciones).getByText("Primera escena")).toBeInTheDocument();
    expect(within(grabaciones).queryByText("✅")).not.toBeInTheDocument();
    expect(within(grabaciones).queryByText("⬜")).not.toBeInTheDocument();
  });

  it.each(["1e2", "0x10", "1.0", "01"])(
    "rechaza el número de lección no canónico %s",
    async (numero) => {
      await expect(renderizarContenidoLeccion({ numero })).rejects.toThrow(
        "NEXT_NOT_FOUND",
      );
      expect(obtenerLeccion).not.toHaveBeenCalled();
    },
  );

  it("enlaza la lección con el teleprompter", async () => {
    render(await renderizarContenidoLeccion());

    const control = screen.getByRole("link", { name: "Abrir en el teleprompter" });
    expect(control).toHaveAttribute(
      "href",
      "/teleprompter?curso=curso-ficticio&leccion=1",
    );
    expect(control).not.toHaveAttribute("aria-disabled");
  });

  it("usa guion cuando la pestaña solicitada no existe", async () => {
    render(await renderizarContenidoLeccion({ pestana: "desconocida" }));

    expect(screen.getByRole("tab", { name: "Guion" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("carga los datos auxiliares solo en las pestañas que los consumen", async () => {
    const teleprompter = {
      curso: "curso-ficticio",
      numero: 1,
      version: "a".repeat(64),
      escenas: [],
      ganchos: [],
    } as unknown as Teleprompter;
    vi.mocked(obtenerTeleprompter).mockResolvedValue(teleprompter);

    render(await renderizarContenidoLeccion());

    expect(obtenerTeleprompter).toHaveBeenCalledWith("curso-ficticio", 1);
    expect(obtenerAcciones).toHaveBeenCalledWith("curso-ficticio", 1);
    expect(screen.getByRole("heading", { name: "Ganchos de los shorts" })).toBeInTheDocument();

    vi.clearAllMocks();
    vi.mocked(obtenerPublicacion).mockResolvedValue(null);
    render(await renderizarContenidoLeccion({ pestana: "grabaciones" }));
    expect(obtenerTeleprompter).toHaveBeenCalledWith("curso-ficticio", 1);
    expect(obtenerAcciones).toHaveBeenCalledWith("curso-ficticio", 1);

    vi.clearAllMocks();
    render(await renderizarContenidoLeccion({ pestana: "video" }));
    expect(obtenerTeleprompter).not.toHaveBeenCalled();
    expect(obtenerAcciones).toHaveBeenCalledWith("curso-ficticio", 1);

    vi.clearAllMocks();
    render(await renderizarContenidoLeccion({ pestana: "shorts" }));
    expect(obtenerTeleprompter).not.toHaveBeenCalled();
    expect(obtenerAcciones).toHaveBeenCalledWith("curso-ficticio", 1);

    vi.clearAllMocks();
    render(await renderizarContenidoLeccion({ pestana: "publicar" }));
    expect(obtenerTeleprompter).not.toHaveBeenCalled();
    expect(obtenerAcciones).not.toHaveBeenCalled();
  });

  it("mantiene la pestaña Guion si falla la lectura de acciones", async () => {
    vi.mocked(obtenerAcciones).mockRejectedValue(new Error("fallo simulado"));

    render(await renderizarContenidoLeccion());

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Primera escena" })).toBeInTheDocument();
  });

  it.each(["grabaciones", "video", "shorts"])(
    "mantiene la pestaña %s si falla la lectura de acciones",
    async (pestana) => {
      vi.mocked(obtenerAcciones).mockRejectedValue(new Error("fallo simulado"));

      render(await renderizarContenidoLeccion({ pestana }));

      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    },
  );

  it("pasa la pieza y la red de la URL a la pestaña Publicar", async () => {
    const publicacion: VistaPublicacion = {
      curso: "curso-ficticio",
      numero: 1,
      piezas: [
        {
          id: "leccion",
          tipo: "leccion",
          titulo: "Pieza ficticia",
          video: null,
          duracion: "1:00",
          fecha_propuesta: null,
          portadas: [],
          portada_elegida: null,
          redes: [
            {
              red: "youtube",
              textos: null,
              estado: { estado: "pendiente", fecha: null, url: null },
            },
            {
              red: "instagram",
              textos: {
                titulos: [],
                descripcion: null,
                etiquetas: [],
                texto: "Texto ficticio de Instagram",
                comentario_fijado: null,
                ajustes: [],
                video: null,
                notas: null,
              },
              estado: { estado: "pendiente", fecha: null, url: null },
            },
          ],
        },
      ],
      despues_de_publicar: [],
      notas: null,
      error: null,
      guia: null,
      aviso: null,
    };
    vi.mocked(obtenerPublicacion).mockResolvedValue(publicacion);

    render(
      await renderizarContenidoLeccion({
        pestana: "publicar",
        pieza: "leccion",
        red: "instagram",
      }),
    );

    expect(obtenerPublicacion).toHaveBeenCalledWith("curso-ficticio", 1);
    expect(screen.getByRole("tab", { name: "Instagram" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
