import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BotonEditarTarea, BotonNuevaTarea } from "@/components/tareas/FormularioTarea";
import {
  crearTarea,
  editarTarea,
  opcionesLecciones,
  opcionesPiezas,
} from "@/lib/acciones-tareas";
import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";

vi.mock("@/lib/acciones-tareas", () => ({
  crearTarea: vi.fn(),
  editarTarea: vi.fn(),
  opcionesLecciones: vi.fn(),
  opcionesPiezas: vi.fn(),
}));

const cursos: Curso[] = [
  { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 4, en_disco: true },
  { id: "vue", nombre: "Vue", carpeta: "cursos/VUE", lecciones: 1, en_disco: true },
  { id: "python", nombre: "Python", carpeta: null, lecciones: 0, en_disco: false },
];

const tipos: TipoTarea[] = [
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

beforeEach(() => {
  vi.mocked(opcionesLecciones).mockImplementation(async (curso) =>
    curso === "react" ? [{ numero: 4, titulo: "Importar y exportar" }] : [{ numero: 1, titulo: "Intro" }],
  );
  vi.mocked(opcionesPiezas).mockResolvedValue([
    { id: "leccion", titulo: "Lección completa" },
    { id: "reel-salida", titulo: "Reel de salida" },
  ]);
});

afterEach(() => {
  vi.clearAllMocks();
});

async function abrirNueva() {
  render(<BotonNuevaTarea cursos={cursos} tipos={tipos} fecha="2026-11-17" />);
  await userEvent.click(screen.getByRole("button", { name: "+ Tarea" }));
  return screen.getByRole("dialog", { name: "Nueva tarea" });
}

describe("FormularioTarea", () => {
  it("activa la lección al elegir un curso con carpeta", async () => {
    await abrirNueva();
    expect(screen.getByLabelText("Lección")).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Curso"), "react");

    await waitFor(() => expect(screen.getByLabelText("Lección")).toBeEnabled());
    expect(opcionesLecciones).toHaveBeenCalledWith("react");
    expect(screen.getByRole("option", { name: "4 · Importar y exportar" })).toBeInTheDocument();
  });

  it("vacía lección, pieza y red al cambiar de curso", async () => {
    await abrirNueva();
    await userEvent.selectOptions(screen.getByLabelText("Curso"), "react");
    await waitFor(() => expect(screen.getByLabelText("Lección")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Lección"), "4");
    await waitFor(() => expect(screen.getByLabelText("Pieza")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Pieza"), "reel-salida");
    await userEvent.selectOptions(screen.getByLabelText("Red"), "instagram");

    await userEvent.selectOptions(screen.getByLabelText("Curso"), "vue");

    expect(screen.getByLabelText("Lección")).toHaveValue("");
    expect(screen.getByLabelText("Pieza")).toHaveValue("");
    expect(screen.getByLabelText("Pieza")).toBeDisabled();
    expect(screen.getByLabelText("Red")).toHaveValue("");
    expect(screen.getByLabelText("Red")).toBeDisabled();
  });

  it("no ofrece lecciones de un curso sin carpeta", async () => {
    await abrirNueva();
    await userEvent.selectOptions(screen.getByLabelText("Curso"), "python");

    expect(screen.getByLabelText("Lección")).toBeDisabled();
    expect(opcionesLecciones).not.toHaveBeenCalled();
  });

  it("crea la tarea con la jerarquía completa del enlace", async () => {
    vi.mocked(crearTarea).mockResolvedValue({ ok: true });
    await abrirNueva();

    await userEvent.type(screen.getByLabelText("Texto"), "Publicar el reel");
    await userEvent.type(screen.getByLabelText("Hora"), "20:15");
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "publicar");
    await userEvent.selectOptions(screen.getByLabelText("Curso"), "react");
    await waitFor(() => expect(screen.getByLabelText("Lección")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Lección"), "4");
    await waitFor(() => expect(screen.getByLabelText("Pieza")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Pieza"), "reel-salida");
    await userEvent.selectOptions(screen.getByLabelText("Red"), "instagram");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(crearTarea).toHaveBeenCalledWith({
        fecha: "2026-11-17",
        hora: "20:15",
        texto: "Publicar el reel",
        tipo: "publicar",
        enlace: { curso: "react", numero: 4, pieza: "reel-salida", red: "instagram" },
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("con el enlace solo hasta la lección no envía pieza ni red", async () => {
    vi.mocked(crearTarea).mockResolvedValue({ ok: true });
    await abrirNueva();

    await userEvent.type(screen.getByLabelText("Texto"), "Revisar guion");
    await userEvent.selectOptions(screen.getByLabelText("Curso"), "react");
    await waitFor(() => expect(screen.getByLabelText("Lección")).toBeEnabled());
    await userEvent.selectOptions(screen.getByLabelText("Lección"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(crearTarea).toHaveBeenCalled());
    const enviada = vi.mocked(crearTarea).mock.calls[0][0];
    expect(enviada.enlace).toEqual({ curso: "react", numero: 4 });
    expect(enviada.hora).toBeNull();
    expect(enviada.tipo).toBe("grabar");
  });

  it("sin curso envía la tarea suelta", async () => {
    vi.mocked(crearTarea).mockResolvedValue({ ok: true });
    await abrirNueva();

    await userEvent.type(screen.getByLabelText("Texto"), "Ordenar el escritorio");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => expect(crearTarea).toHaveBeenCalled());
    expect(vi.mocked(crearTarea).mock.calls[0][0].enlace).toBeNull();
  });

  it("desactiva Guardar con el texto vacío o de más de 300 caracteres", async () => {
    await abrirNueva();
    const guardar = screen.getByRole("button", { name: "Guardar" });
    expect(guardar).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Texto"), "   ");
    expect(guardar).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Texto"));
    await userEvent.click(screen.getByLabelText("Texto"));
    await userEvent.paste("x".repeat(301));
    expect(guardar).toBeDisabled();
    expect(screen.getByText("301/300")).toBeInTheDocument();
  });

  it("muestra el error y conserva lo escrito", async () => {
    vi.mocked(crearTarea).mockResolvedValue({ ok: false, mensaje: "La pieza no existe" });
    await abrirNueva();

    await userEvent.type(screen.getByLabelText("Texto"), "Grabar gancho");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La pieza no existe");
    expect(screen.getByLabelText("Texto")).toHaveValue("Grabar gancho");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("Cancelar y Escape cierran sin guardar", async () => {
    await abrirNueva();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "+ Tarea" }));
    expect(screen.getByLabelText("Texto")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(crearTarea).not.toHaveBeenCalled();
  });

  it("edita una tarea con sus valores cargados", async () => {
    vi.mocked(editarTarea).mockResolvedValue({ ok: true });
    const tarea: TareaVista = {
      id: 9,
      fecha: "2026-11-18",
      hora: "09:30",
      texto: "Publicar lección",
      tipo: "publicar",
      hecha: false,
      hecha_en: null,
      enlace: { curso: "react", numero: 4, pieza: "leccion", red: "youtube" },
      enlace_vista: {
        curso_nombre: "React",
        leccion_titulo: "Importar y exportar",
        pieza_titulo: "Lección completa",
        roto: false,
      },
    };
    render(<BotonEditarTarea tarea={tarea} cursos={cursos} tipos={tipos} />);

    await userEvent.click(screen.getByRole("button", { name: "Editar «Publicar lección»" }));
    expect(screen.getByRole("dialog", { name: "Editar tarea" })).toBeInTheDocument();
    expect(screen.getByLabelText("Texto")).toHaveValue("Publicar lección");
    expect(screen.getByLabelText("Fecha")).toHaveValue("2026-11-18");
    await waitFor(() => expect(screen.getByLabelText("Pieza")).toHaveValue("leccion"));
    expect(screen.getByLabelText("Lección")).toHaveValue("4");
    expect(screen.getByLabelText("Red")).toHaveValue("youtube");

    await userEvent.clear(screen.getByLabelText("Texto"));
    await userEvent.type(screen.getByLabelText("Texto"), "Publicar lección 4");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(editarTarea).toHaveBeenCalledWith(9, {
        fecha: "2026-11-18",
        hora: "09:30",
        texto: "Publicar lección 4",
        tipo: "publicar",
        enlace: { curso: "react", numero: 4, pieza: "leccion", red: "youtube" },
      }),
    );
  });
});
