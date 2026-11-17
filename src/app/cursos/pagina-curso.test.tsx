import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PaginaCurso from "@/app/cursos/[curso]/page";
import PaginaCursos from "@/app/cursos/page";
import { obtenerCursos, obtenerLecciones } from "@/lib/api";

vi.mock("next/server", () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/acciones-tareas", () => ({
  crearCurso: vi.fn(),
  borrarCurso: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/api")>();
  return { ...original, obtenerCursos: vi.fn(), obtenerLecciones: vi.fn() };
});

async function contenidoCurso(curso: string) {
  const pagina = PaginaCurso({
    params: Promise.resolve({ curso }),
    searchParams: Promise.resolve({}),
  });
  const suspense = (
    pagina as ReactElement<{
      children: ReactElement<{ children: ReactElement<Record<string, unknown>> }>;
    }>
  ).props.children;
  const contenido = suspense.props.children;
  const cargar = contenido.type as (props: Record<string, unknown>) => Promise<ReactNode>;
  return cargar(contenido.props);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(obtenerCursos).mockResolvedValue([
    { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 0, en_disco: true },
    { id: "python", nombre: "Python", carpeta: null, lecciones: 0, en_disco: false },
  ]);
  vi.mocked(obtenerLecciones).mockResolvedValue([]);
});

describe("cursos de la app", () => {
  it("la lista marca los cursos sin carpeta y ofrece darlos de alta", async () => {
    render(await PaginaCursos());

    expect(screen.getByText("Sin carpeta todavía")).toBeInTheDocument();
    expect(screen.getAllByText("Sin carpeta todavía")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "+ Curso" })).toBeInTheDocument();
  });

  it("un curso de la app sin lecciones muestra su nombre, el aviso y el botón de borrar", async () => {
    render(await contenidoCurso("python"));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Python");
    expect(screen.getByText("Este curso aún no tiene lecciones en disco")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Borrar el curso" })).toBeInTheDocument();
  });

  it("un curso de disco sin lecciones no ofrece borrarlo", async () => {
    render(await contenidoCurso("react"));

    expect(screen.getByText("Este curso aún no tiene lecciones en disco")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Borrar el curso" })).toBeNull();
  });
});
