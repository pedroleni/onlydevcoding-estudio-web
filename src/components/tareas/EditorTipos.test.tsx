import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EditorTipos } from "@/components/tareas/EditorTipos";
import { borrarTipoTarea, crearTipoTarea, editarTipoTarea } from "@/lib/acciones-tareas";
import type { TipoTarea } from "@/lib/tipos";

vi.mock("@/lib/acciones-tareas", () => ({
  crearTipoTarea: vi.fn(),
  editarTipoTarea: vi.fn(),
  borrarTipoTarea: vi.fn(),
}));

const tipos: TipoTarea[] = [
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function fila(nombre: string) {
  return screen.getByRole("group", { name: `Tipo ${nombre}` });
}

describe("EditorTipos", () => {
  it("crea un tipo con el id derivado del nombre y el orden siguiente", async () => {
    vi.mocked(crearTipoTarea).mockResolvedValue({ ok: true });
    render(<EditorTipos tipos={tipos} />);

    const nuevo = screen.getByRole("group", { name: "Nuevo tipo" });
    await userEvent.type(within(nuevo).getByLabelText("Nombre"), "Edición rápida");
    expect(within(nuevo).getByLabelText("Id")).toHaveValue("edicion-rapida");
    await userEvent.selectOptions(within(nuevo).getByLabelText("Color"), "#299BC6");
    await userEvent.click(within(nuevo).getByRole("button", { name: "Crear tipo" }));

    await waitFor(() =>
      expect(crearTipoTarea).toHaveBeenCalledWith({
        id: "edicion-rapida",
        nombre: "Edición rápida",
        color: "#299BC6",
        orden: 5,
      }),
    );
  });

  it("respeta un id escrito a mano", async () => {
    vi.mocked(crearTipoTarea).mockResolvedValue({ ok: true });
    render(<EditorTipos tipos={tipos} />);

    const nuevo = screen.getByRole("group", { name: "Nuevo tipo" });
    await userEvent.type(within(nuevo).getByLabelText("Id"), "rapido");
    await userEvent.type(within(nuevo).getByLabelText("Nombre"), "Edición rápida");

    expect(within(nuevo).getByLabelText("Id")).toHaveValue("rapido");
  });

  it("guarda los cambios de un tipo", async () => {
    vi.mocked(editarTipoTarea).mockResolvedValue({ ok: true });
    render(<EditorTipos tipos={tipos} />);

    const grabar = fila("Grabar");
    await userEvent.selectOptions(within(grabar).getByLabelText("Color"), "#A371F7");
    await userEvent.click(within(grabar).getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(editarTipoTarea).toHaveBeenCalledWith("grabar", {
        nombre: "Grabar",
        color: "#A371F7",
        orden: 2,
      }),
    );
  });

  it("muestra el 409 al borrar un tipo en uso", async () => {
    vi.mocked(borrarTipoTarea).mockResolvedValue({
      ok: false,
      mensaje: "Hay tareas de este tipo; cámbialas antes de borrarlo",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<EditorTipos tipos={tipos} />);

    const grabar = fila("Grabar");
    await userEvent.click(within(grabar).getByRole("button", { name: "Borrar" }));

    expect(await within(grabar).findByRole("alert")).toHaveTextContent(
      "Hay tareas de este tipo; cámbialas antes de borrarlo",
    );
    expect(borrarTipoTarea).toHaveBeenCalledWith("grabar");
  });

  it("no borra sin confirmar", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<EditorTipos tipos={tipos} />);

    await userEvent.click(within(fila("Publicar")).getByRole("button", { name: "Borrar" }));

    expect(borrarTipoTarea).not.toHaveBeenCalled();
  });

  it("confirma el guardado y no deja guardar sin orden", async () => {
    vi.mocked(editarTipoTarea).mockResolvedValue({ ok: true });
    render(<EditorTipos tipos={tipos} />);

    const publicar = fila("Publicar");
    await userEvent.click(within(publicar).getByRole("button", { name: "Guardar" }));
    expect(await within(publicar).findByRole("status")).toHaveTextContent("Guardado");

    await userEvent.clear(within(publicar).getByLabelText("Orden"));
    expect(within(publicar).getByRole("button", { name: "Guardar" })).toBeDisabled();
  });
});
