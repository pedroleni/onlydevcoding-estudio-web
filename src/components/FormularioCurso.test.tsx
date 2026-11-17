import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BotonBorrarCurso, FormularioCurso } from "@/components/FormularioCurso";
import { borrarCurso, crearCurso } from "@/lib/acciones-tareas";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/acciones-tareas", () => ({
  crearCurso: vi.fn(),
  borrarCurso: vi.fn(),
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("FormularioCurso", () => {
  it("da de alta un curso con el id derivado del nombre", async () => {
    vi.mocked(crearCurso).mockResolvedValue({ ok: true });
    render(<FormularioCurso />);

    await userEvent.click(screen.getByRole("button", { name: "+ Curso" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Python Básico");
    expect(screen.getByLabelText("Id")).toHaveValue("python-basico");
    await userEvent.click(screen.getByRole("button", { name: "Dar de alta" }));

    await waitFor(() => expect(crearCurso).toHaveBeenCalledWith("python-basico", "Python Básico"));
    await waitFor(() => expect(screen.queryByLabelText("Nombre")).toBeNull());
  });

  it("muestra el error y conserva lo escrito", async () => {
    vi.mocked(crearCurso).mockResolvedValue({ ok: false, mensaje: "El curso ya existe" });
    render(<FormularioCurso />);

    await userEvent.click(screen.getByRole("button", { name: "+ Curso" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "React");
    await userEvent.click(screen.getByRole("button", { name: "Dar de alta" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El curso ya existe");
    expect(screen.getByLabelText("Nombre")).toHaveValue("React");
  });
});

describe("BotonBorrarCurso", () => {
  it("borra tras confirmar y vuelve a la lista de cursos", async () => {
    vi.mocked(borrarCurso).mockResolvedValue({ ok: true });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BotonBorrarCurso curso="python" nombre="Python" />);

    await userEvent.click(screen.getByRole("button", { name: "Borrar el curso" }));

    await waitFor(() => expect(borrarCurso).toHaveBeenCalledWith("python"));
    expect(push).toHaveBeenCalledWith("/cursos");
  });

  it("muestra el 409 si el curso tiene tareas", async () => {
    vi.mocked(borrarCurso).mockResolvedValue({
      ok: false,
      mensaje: "El curso tiene tareas",
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<BotonBorrarCurso curso="python" nombre="Python" />);

    await userEvent.click(screen.getByRole("button", { name: "Borrar el curso" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El curso tiene tareas");
    expect(push).not.toHaveBeenCalled();
  });
});
