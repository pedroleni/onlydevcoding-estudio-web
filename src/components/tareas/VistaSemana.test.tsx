import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { VistaSemana } from "@/components/tareas/VistaSemana";
import type { TareaVista, TipoTarea } from "@/lib/tipos";
import type { ParametrosTareas } from "@/lib/vista-tareas";

const tipos: TipoTarea[] = [
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

function tarea(parcial: Partial<TareaVista> & { id: number }): TareaVista {
  return {
    fecha: "2025-12-29",
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

const parametros: ParametrosTareas = {
  vista: "semana",
  dia: "2026-01-01",
  curso: null,
  tipo: null,
};

function columnas() {
  return screen.getAllByRole("listitem").filter((item) => item.dataset.dia !== undefined);
}

describe("VistaSemana", () => {
  it("muestra de lunes a domingo aunque la semana cruce el año", () => {
    render(<VistaSemana tareas={[]} tipos={tipos} parametros={parametros} />);

    const cabeceras = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(cabeceras).toEqual([
      "lun 29",
      "mar 30",
      "mié 31",
      "jue 1",
      "vie 2",
      "sáb 3",
      "dom 4",
    ]);
  });

  it("coloca cada tarea en su día y tacha las hechas", () => {
    render(
      <VistaSemana
        tareas={[
          tarea({ id: 1, fecha: "2025-12-31", texto: "Voz L5" }),
          tarea({ id: 2, fecha: "2025-12-29", texto: "Render", hecha: true }),
        ]}
        tipos={tipos}
        parametros={parametros}
      />,
    );

    const dias = columnas();
    expect(within(dias[2]).getByText("Voz L5")).toBeInTheDocument();
    expect(within(dias[0]).getByText("Render")).toHaveClass("line-through");
    expect(within(dias[2]).getByText("Voz L5")).not.toHaveClass("line-through");
  });

  it("aplica el filtro de tipo", () => {
    render(
      <VistaSemana
        tareas={[
          tarea({ id: 1, texto: "Grabar gancho" }),
          tarea({ id: 2, texto: "Publicar reel", tipo: "publicar" }),
        ]}
        tipos={tipos}
        parametros={{ ...parametros, tipo: "publicar" }}
      />,
    );

    expect(screen.getByText("Publicar reel")).toBeInTheDocument();
    expect(screen.queryByText("Grabar gancho")).toBeNull();
  });

  it("enlaza la cabecera de cada día con su vista de día", () => {
    render(<VistaSemana tareas={[]} tipos={tipos} parametros={{ ...parametros, curso: "react" }} />);

    expect(screen.getByRole("link", { name: "mar 30" })).toHaveAttribute(
      "href",
      "/tareas?vista=dia&dia=2025-12-30&curso=react",
    );
  });

  it("ordena las tareas del día por hora", () => {
    render(
      <VistaSemana
        tareas={[
          tarea({ id: 1, texto: "Sin hora" }),
          tarea({ id: 2, texto: "A las 9", hora: "09:00" }),
        ]}
        tipos={tipos}
        parametros={parametros}
      />,
    );

    const textos = within(columnas()[0])
      .getAllByRole("listitem")
      .map((item) => item.textContent);
    expect(textos[0]).toContain("A las 9");
    expect(textos[1]).toContain("Sin hora");
  });
});
