import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VistaTodas } from "@/components/tareas/VistaTodas";
import { editarTarea } from "@/lib/acciones-tareas";
import type { TareaVista, TipoTarea } from "@/lib/tipos";

vi.mock("@/lib/acciones-tareas", () => ({
  marcarHecha: vi.fn(),
  borrarTarea: vi.fn(),
  editarTarea: vi.fn(),
}));

const tipos: TipoTarea[] = [
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

function tarea(parcial: Partial<TareaVista> & { id: number }): TareaVista {
  return {
    fecha: null,
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

function deLeccion(id: number, numero: number, titulo: string, hecha = false): TareaVista {
  return tarea({
    id,
    hecha,
    enlace: { curso: "react", numero },
    enlace_vista: {
      curso_nombre: "React",
      leccion_titulo: titulo,
      pieza_titulo: null,
      roto: false,
    },
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("VistaTodas", () => {
  it("dice que no hay tareas sin día cuando la lista está vacía", () => {
    render(<VistaTodas tareas={[]} tipos={tipos} />);

    expect(screen.getByText("No hay tareas sin día")).toBeInTheDocument();
  });

  it("agrupa por lección con su recuento y abre la primera con pendientes", () => {
    const { container } = render(
      <VistaTodas
        tareas={[
          deLeccion(1, 6, "Las llaves", true),
          deLeccion(2, 7, "Debajo de JSX"),
          deLeccion(3, 7, "Debajo de JSX", true),
          deLeccion(4, 40, "Efectos"),
          tarea({ id: 5, texto: "Comprar micro" }),
        ]}
        tipos={tipos}
      />,
    );

    const grupos = [...container.querySelectorAll("details")];
    expect(grupos.map((grupo) => grupo.querySelector("summary")?.textContent)).toEqual([
      "▶6 · Las llaves1/1",
      "▶7 · Debajo de JSX1/2",
      "▶40 · Efectos0/1",
      "▶Sin curso0/1",
    ]);
    expect(grupos.map((grupo) => grupo.open)).toEqual([false, true, false, false]);
    expect(screen.getByText(/pendientes de/)).toHaveTextContent(
      "3 pendientes de 5 en 4 grupos",
    );
  });

  it("asigna el día elegido sin cambiar el resto de la tarea", async () => {
    vi.mocked(editarTarea).mockResolvedValue({ ok: true });
    render(<VistaTodas tareas={[deLeccion(2, 7, "Debajo de JSX")]} tipos={tipos} />);

    const fila = screen.getByText("Tarea 2").closest("li")!;
    const selector = within(fila).getByLabelText("Poner día a «Tarea 2»");
    await userEvent.type(selector, "2026-11-25");

    expect(editarTarea).toHaveBeenLastCalledWith(2, {
      fecha: "2026-11-25",
      hora: null,
      texto: "Tarea 2",
      tipo: "grabar",
      enlace: { curso: "react", numero: 7 },
    });
  });

  it("no ofrece poner día a una tarea hecha", () => {
    render(<VistaTodas tareas={[deLeccion(1, 6, "Las llaves", true)]} tipos={tipos} />);

    expect(screen.queryByLabelText(/Poner día/)).not.toBeInTheDocument();
  });
});
