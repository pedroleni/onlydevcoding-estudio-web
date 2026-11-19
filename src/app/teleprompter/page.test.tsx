import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaginaTeleprompter from "@/app/teleprompter/page";
import { notFound } from "next/navigation";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerAcciones,
  obtenerCursos,
  obtenerLecciones,
  obtenerTeleprompter,
} from "@/lib/api";
import type { EstadoAccion, LeccionResumen, Teleprompter } from "@/lib/tipos";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/acciones-teleprompter", () => ({
  guardarTextos: vi.fn(),
  generarPreviaGrabacion: vi.fn(),
}));

vi.mock("@/lib/acciones-entregas", () => ({
  leerEntregas: vi.fn(async () => ({
    ok: true,
    entregas: { archivos: [], propuesta: null, destinos: { camara: [], ganchos: [] } },
  })),
  quitarEntrega: vi.fn(),
  colocarTomas: vi.fn(),
}));

vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...original,
    obtenerCursos: vi.fn(),
    obtenerLecciones: vi.fn(),
    obtenerTeleprompter: vi.fn(),
    obtenerAcciones: vi.fn(),
  };
});

function resumen(numero: number, guion: boolean): LeccionResumen {
  return {
    curso: "curso-ficticio",
    numero,
    slug: `leccion-${numero}`,
    titulo: `Lección ficticia ${numero}`,
    estado: {
      guion,
      voz: { hechas: 0, total: 0 },
      camara: { hechas: 0, total: 0 },
      video_final: false,
      miniatura: null,
      previa: null,
      publicado: {},
    },
  };
}

const datos = { curso: "curso-ficticio", numero: 2 } as Teleprompter;

type PropsTeleprompter = {
  datos: Teleprompter | null;
  lecciones: Array<{ curso: string; numero: number; titulo: string; nombreCurso: string }>;
  seleccion: { curso: string; numero: number } | null;
  acciones?: EstadoAccion[] | null;
};

async function cargarContenido(consulta: Record<string, string | string[]>) {
  const pagina = PaginaTeleprompter({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(consulta),
  } as PageProps<"/teleprompter">);
  // La sección lleva el selector de modo y, después, el límite de Suspense con el contenido.
  const hijos = (
    pagina as ReactElement<{
      children: ReactElement<{ children: ReactElement<Record<string, unknown>> }>[];
    }>
  ).props.children;
  const suspense = hijos[hijos.length - 1];
  const contenido = suspense.props.children;
  const cargar = contenido.type as (props: Record<string, unknown>) => Promise<ReactNode>;
  return cargar(contenido.props);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(notFound).mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  });
  vi.mocked(obtenerCursos).mockResolvedValue([
    { id: "curso-ficticio", nombre: "Curso ficticio", carpeta: null, lecciones: 3, en_disco: true },
    { id: "curso-vacio", nombre: "Curso vacío", carpeta: null, lecciones: 0, en_disco: false },
  ]);
  vi.mocked(obtenerLecciones).mockImplementation(async (curso) =>
    curso === "curso-ficticio" ? [resumen(1, false), resumen(2, true), resumen(3, true)] : null,
  );
  vi.mocked(obtenerTeleprompter).mockResolvedValue(datos);
  vi.mocked(obtenerAcciones).mockResolvedValue([]);
});

describe("página del teleprompter", () => {
  it("no espera los searchParams antes de Suspense", () => {
    const resultado = PaginaTeleprompter({
      params: Promise.resolve({}),
      searchParams: new Promise<never>(() => undefined),
    } as PageProps<"/teleprompter">);

    expect(resultado).not.toBeInstanceOf(Promise);
  });

  it("pide el teleprompter de la lección y lista solo las lecciones con guion", async () => {
    const elemento = (await cargarContenido({ curso: "curso-ficticio", leccion: "2" })) as ReactElement<PropsTeleprompter>;

    expect(obtenerTeleprompter).toHaveBeenCalledWith("curso-ficticio", 2);
    expect(elemento.props.datos).toBe(datos);
    expect(elemento.props.seleccion).toEqual({ curso: "curso-ficticio", numero: 2 });
    expect(elemento.props.lecciones).toEqual([
      { curso: "curso-ficticio", numero: 2, titulo: "Lección ficticia 2", nombreCurso: "Curso ficticio" },
      { curso: "curso-ficticio", numero: 3, titulo: "Lección ficticia 3", nombreCurso: "Curso ficticio" },
    ]);
  });

  it("pasa las acciones de la lección, para seguir una identificación en marcha", async () => {
    const acciones = [{ id: "identificar-tomas" }] as EstadoAccion[];
    vi.mocked(obtenerAcciones).mockResolvedValue(acciones);

    const elemento = (await cargarContenido({ curso: "curso-ficticio", leccion: "2" })) as ReactElement<PropsTeleprompter>;

    expect(obtenerAcciones).toHaveBeenCalledWith("curso-ficticio", 2);
    expect(elemento.props.acciones).toBe(acciones);
  });

  it.each([
    ["la API no está disponible", () => new ApiNoDisponible()],
    ["la API rechaza las acciones", () => new ErrorApi(500)],
  ])("si %s al leer las acciones, el teleprompter se abre sin ellas", async (_caso, crearError) => {
    vi.mocked(obtenerAcciones).mockRejectedValue(crearError());

    const elemento = (await cargarContenido({ curso: "curso-ficticio", leccion: "2" })) as ReactElement<PropsTeleprompter>;

    expect(elemento.props.datos).toBe(datos);
    expect(elemento.props.acciones).toBeNull();
  });

  it("sin parámetros no pide ningún teleprompter", async () => {
    const elemento = (await cargarContenido({ curso: "curso-ficticio" })) as ReactElement<PropsTeleprompter>;

    expect(obtenerTeleprompter).not.toHaveBeenCalled();
    expect(obtenerAcciones).not.toHaveBeenCalled();
    expect(elemento.props.datos).toBeNull();
    expect(elemento.props.seleccion).toBeNull();
  });

  it.each([
    { curso: "../fuera", leccion: "2" },
    { curso: "curso-ficticio", leccion: "02" },
    { curso: "curso-ficticio", leccion: "1e2" },
  ])("rechaza parámetros no válidos %o", async (consulta) => {
    await expect(cargarContenido(consulta)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(obtenerTeleprompter).not.toHaveBeenCalled();
  });

  it("muestra el aviso de la API si no responde", async () => {
    vi.mocked(obtenerCursos).mockRejectedValue(new ApiNoDisponible());

    render(await cargarContenido({ curso: "curso-ficticio", leccion: "2" }));

    expect(screen.getByRole("alert")).toHaveTextContent("No se puede conectar con la API");
  });
});
