import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VistaDia } from "@/components/tareas/VistaDia";
import { borrarTarea, marcarHecha } from "@/lib/acciones-tareas";
import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";

vi.mock("@/lib/acciones-tareas", () => ({
  marcarHecha: vi.fn(),
  borrarTarea: vi.fn(),
}));

const tipos: TipoTarea[] = [
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

const cursos: Curso[] = [
  { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 4, en_disco: true },
];

function tarea(parcial: Partial<TareaVista> & { id: number }): TareaVista {
  return {
    fecha: "2026-11-17",
    hora: null,
    texto: `Tarea ${parcial.id}`,
    tipo: "grabar",
    hecha: false,
    hecha_en: null,
    enlace: null,
    enlace_vista: null,
    ...parcial,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("VistaDia", () => {
  it("dice que no hay tareas cuando el día está vacío", () => {
    render(<VistaDia tareas={[]} atrasadas={[]} cursos={cursos} tipos={tipos} esHoy={false} />);

    expect(screen.getByText("No hay tareas para este día")).toBeInTheDocument();
  });

  it("pinta un texto con etiquetas HTML como texto", () => {
    const { container } = render(
      <VistaDia
        tareas={[tarea({ id: 1, texto: "<script>alert(1)</script>" })]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });

  it("enlaza la pieza y marca el enlace roto sin enlace", () => {
    render(
      <VistaDia
        tareas={[
          tarea({
            id: 1,
            texto: "Publicar el reel",
            tipo: "publicar",
            hora: "20:15",
            enlace: { curso: "react", numero: 4, pieza: "reel-salida", red: "instagram" },
            enlace_vista: {
              curso_nombre: "React",
              leccion_titulo: "Importar",
              pieza_titulo: "Reel de salida",
              roto: false,
            },
          }),
          tarea({
            id: 2,
            texto: "Grabar el gancho",
            enlace: { curso: "react", numero: 9, pieza: "short-1" },
            enlace_vista: { curso_nombre: "React", leccion_titulo: null, pieza_titulo: null, roto: true },
          }),
        ]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Lección 4 · Reel de salida · Instagram" }),
    ).toHaveAttribute("href", "/cursos/react/4?pestana=publicar&pieza=reel-salida&red=instagram");
    expect(screen.getByText("20:15")).toBeInTheDocument();

    const rota = screen.getByText("Grabar el gancho").closest("li");
    expect(rota).not.toBeNull();
    expect(within(rota as HTMLElement).getByText("Enlace roto")).toBeInTheDocument();
    expect(within(rota as HTMLElement).queryByRole("link")).toBeNull();
  });

  it("agrupa por curso y por tipo", () => {
    render(
      <VistaDia
        tareas={[
          tarea({ id: 1, tipo: "publicar", enlace: { curso: "react" } }),
          tarea({ id: 2, tipo: "grabar" }),
        ]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    const encabezados = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(encabezados).toEqual(["React", "Sin curso"]);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Publicar",
      "Grabar",
    ]);
  });

  it("muestra las atrasadas solo si el día es hoy", () => {
    const atrasada = tarea({ id: 7, fecha: "2026-11-15", texto: "Revisar miniatura" });
    const { rerender } = render(
      <VistaDia tareas={[]} atrasadas={[atrasada]} cursos={cursos} tipos={tipos} esHoy />,
    );

    const grupo = screen.getByRole("region", { name: "Atrasadas" });
    expect(within(grupo).getByText("Revisar miniatura")).toBeInTheDocument();
    expect(within(grupo).getByText("dom 15 nov")).toBeInTheDocument();

    rerender(
      <VistaDia tareas={[]} atrasadas={[atrasada]} cursos={cursos} tipos={tipos} esHoy={false} />,
    );
    expect(screen.queryByRole("region", { name: "Atrasadas" })).toBeNull();
  });

  it("marca una tarea como hecha con la casilla", async () => {
    vi.mocked(marcarHecha).mockResolvedValue({ ok: true });
    render(
      <VistaDia
        tareas={[tarea({ id: 3, texto: "Voz en off" })]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Voz en off" }));

    await waitFor(() => expect(marcarHecha).toHaveBeenCalledWith(3, true));
  });

  it("muestra el error de la casilla junto a la tarea", async () => {
    vi.mocked(marcarHecha).mockResolvedValue({ ok: false, mensaje: "La API no responde" });
    render(
      <VistaDia
        tareas={[tarea({ id: 3, texto: "Voz en off" })]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    await userEvent.click(screen.getByRole("checkbox", { name: "Voz en off" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La API no responde");
  });

  it("borra una tarea solo tras confirmar", async () => {
    vi.mocked(borrarTarea).mockResolvedValue({ ok: true });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(
      <VistaDia
        tareas={[tarea({ id: 5, texto: "Render final" })]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    const boton = screen.getByRole("button", { name: "Borrar «Render final»" });
    await userEvent.click(boton);
    expect(borrarTarea).not.toHaveBeenCalled();

    await userEvent.click(boton);
    await waitFor(() => expect(borrarTarea).toHaveBeenCalledWith(5));
    expect(confirmar).toHaveBeenCalledTimes(2);
  });

  it("marca la casilla al instante mientras espera a la API", async () => {
    let terminar: (valor: { ok: true }) => void = () => {};
    vi.mocked(marcarHecha).mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = resolver;
        }),
    );
    render(
      <VistaDia
        tareas={[tarea({ id: 8, texto: "Montaje" })]}
        atrasadas={[]}
        cursos={cursos}
        tipos={tipos}
        esHoy={false}
      />,
    );

    const casilla = screen.getByRole("checkbox", { name: "Montaje" });
    await userEvent.click(casilla);

    expect(casilla).toBeChecked();
    terminar({ ok: true });
  });
});
