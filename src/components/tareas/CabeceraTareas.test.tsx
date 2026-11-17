import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CabeceraTareas } from "@/components/tareas/CabeceraTareas";
import type { Curso, TipoTarea } from "@/lib/tipos";

const cursos: Curso[] = [
  { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 4, en_disco: true },
];
const tipos: TipoTarea[] = [{ id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 }];

describe("CabeceraTareas", () => {
  it("navega de día en día conservando los filtros", () => {
    render(
      <CabeceraTareas
        parametros={{ vista: "dia", dia: "2026-11-16", curso: "react", tipo: null }}
        hoy="2026-11-17"
        cursos={cursos}
        tipos={tipos}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("lun 16 nov");
    expect(screen.getByRole("link", { name: "Día anterior: dom 15 nov" })).toHaveAttribute(
      "href",
      "/tareas?vista=dia&dia=2026-11-15&curso=react",
    );
    expect(screen.getByRole("link", { name: "Día siguiente: mar 17 nov" })).toHaveAttribute(
      "href",
      "/tareas?vista=dia&dia=2026-11-17&curso=react",
    );
    expect(screen.getByRole("link", { name: "Hoy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Semana" })).toHaveAttribute(
      "href",
      "/tareas?vista=semana&dia=2026-11-16&curso=react",
    );
    expect(screen.getByRole("link", { name: "Día" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tipos" })).toHaveAttribute("href", "/tareas/tipos");
  });

  it("no ofrece «Hoy» si ya se ve hoy, y salta de semana en semana", () => {
    render(
      <CabeceraTareas
        parametros={{ vista: "semana", dia: "2026-11-17", curso: null, tipo: null }}
        hoy="2026-11-17"
        cursos={cursos}
        tipos={tipos}
      />,
    );

    expect(screen.queryByRole("link", { name: "Hoy" })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Semana del lun 16 nov");
    expect(screen.getByRole("link", { name: /Semana anterior/ })).toHaveAttribute(
      "href",
      "/tareas?vista=semana&dia=2026-11-09",
    );
  });

  it("actualiza los filtros al navegar sin desmontar la cabecera", () => {
    const { rerender } = render(
      <CabeceraTareas
        parametros={{ vista: "dia", dia: "2026-11-16", curso: "react", tipo: "grabar" }}
        hoy="2026-11-17"
        cursos={cursos}
        tipos={tipos}
      />,
    );

    rerender(
      <CabeceraTareas
        parametros={{ vista: "dia", dia: "2026-11-16", curso: null, tipo: null }}
        hoy="2026-11-17"
        cursos={cursos}
        tipos={tipos}
      />,
    );

    expect(screen.getByLabelText("Curso")).toHaveValue("");
    expect(screen.getByLabelText("Tipo")).toHaveValue("");
  });

  it("filtra con un formulario GET que conserva la vista y el día", () => {
    const { container } = render(
      <CabeceraTareas
        parametros={{ vista: "dia", dia: "2026-11-16", curso: null, tipo: "grabar" }}
        hoy="2026-11-17"
        cursos={cursos}
        tipos={tipos}
      />,
    );

    const formulario = container.querySelector("form");
    expect(formulario).toHaveAttribute("method", "get");
    expect(formulario).toHaveAttribute("action", "/tareas");
    expect(screen.getByLabelText("Curso")).toHaveValue("");
    expect(screen.getByLabelText("Tipo")).toHaveValue("grabar");
    expect(screen.getByRole("option", { name: "Sin curso" })).toHaveValue("sin-curso");
  });
});
