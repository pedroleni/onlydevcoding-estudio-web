import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { ListaLecciones } from "@/components/ListaLecciones";
import { fichasCurso } from "@/lib/lecciones-curso";
import type { EstadoLeccion } from "@/lib/tipos";

const ESTADO: EstadoLeccion = {
  guion: true,
  voz: { hechas: 5, total: 10 },
  camara: { hechas: 1, total: 2 },
  video_final: false,
  miniatura: null,
  previa: null,
  publicado: {},
};

const FICHAS = fichasCurso(
  [{ curso: "react", numero: 1, slug: "l1", titulo: "¿Qué problema resuelve React?", estado: ESTADO }],
  [
    { numero: 1, titulo: "Largo", modulo: "Primeros pasos" },
    { numero: 2, titulo: "Crear un proyecto con Vite", modulo: "Primeros pasos" },
    { numero: 14, titulo: "Proyecto: la carta de un restaurante", modulo: "Describir la interfaz" },
  ],
);

describe("lista de lecciones del curso", () => {
  it("agrupa por módulo, enlaza lo preparado y deja lo previsto sin enlace", () => {
    render(<ListaLecciones curso="react" fichas={FICHAS} />);

    const primeros = screen.getByRole("region", { name: "Primeros pasos" });
    expect(within(primeros).getByText("1/2 preparadas · 0 terminadas")).toBeInTheDocument();
    expect(within(primeros).getByRole("link", { name: /Qué problema resuelve React/ })).toHaveAttribute(
      "href",
      "/cursos/react/1",
    );
    expect(within(primeros).getByLabelText("Voz 5/10")).toBeInTheDocument();
    expect(within(primeros).getByLabelText("Publicación 0/17")).toBeInTheDocument();
    expect(
      within(primeros).getByLabelText("Lección 2: Crear un proyecto con Vite, por preparar"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Describir la interfaz" })).toBeInTheDocument();
  });

  it("busca por texto y por número de capítulo", async () => {
    const usuario = userEvent.setup();
    render(<ListaLecciones curso="react" fichas={FICHAS} />);

    await usuario.type(screen.getByLabelText("Buscar lección"), "restaurante");
    expect(screen.queryByRole("region", { name: "Primeros pasos" })).toBeNull();
    expect(screen.getByText("1 lección")).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Buscar lección"));
    await usuario.type(screen.getByLabelText("Número de capítulo"), "7");
    expect(screen.getByText("Ninguna lección coincide con la búsqueda.")).toBeInTheDocument();

    await usuario.clear(screen.getByLabelText("Número de capítulo"));
    await usuario.type(screen.getByLabelText("Número de capítulo"), "1{Enter}");
    expect(push).toHaveBeenCalledWith("/cursos/react/1");
  });
});
