import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PanelShorts } from "@/components/acciones/PanelShorts";
import { lanzarAccion } from "@/lib/acciones-estudio";
import type { EstadoAccion, Trabajo } from "@/lib/tipos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

function trabajo(id: number, objetivo: string, estado: Trabajo["estado"]): Trabajo {
  return {
    id,
    accion: "render-short",
    curso: "curso-ficticio",
    numero: 4,
    objetivo,
    estado,
    progreso: estado === "hecho" ? 1 : 0,
    inicio: "2026-11-18T10:00:00Z",
    fin: estado === "en_marcha" ? null : "2026-11-18T10:01:00Z",
    error: estado === "error" ? "Remotion terminó con el código 1" : null,
  };
}

const preparar: EstadoAccion = {
  id: "preparar-shorts",
  etiqueta: "Preparar los shorts",
  disponible: true,
  motivo: null,
  opciones: [],
  ultimo: null,
  ultimos: {},
};

const renderizar: EstadoAccion = {
  id: "render-short",
  etiqueta: "Renderizar el short",
  disponible: true,
  motivo: null,
  opciones: ["s1", "s2"],
  ultimo: trabajo(2, "s2", "error"),
  ultimos: {
    s1: trabajo(1, "s1", "hecho"),
    s2: trabajo(2, "s2", "error"),
  },
};

afterEach(() => vi.clearAllMocks());

describe("PanelShorts", () => {
  it("muestra una fila y el último trabajo de cada short", () => {
    render(
      <PanelShorts
        curso="curso-ficticio"
        numero={4}
        acciones={[preparar, renderizar]}
      />,
    );

    const filas = screen.getAllByRole("listitem");
    expect(filas).toHaveLength(2);
    expect(within(filas[0]).getByText("s1")).toBeInTheDocument();
    expect(within(filas[0]).getByText("Hecho")).toBeInTheDocument();
    expect(within(filas[1]).getByText("s2")).toBeInTheDocument();
    expect(
      within(filas[1]).getByText("Falló: Remotion terminó con el código 1"),
    ).toBeInTheDocument();
  });

  it("envía solo el id de la fila elegida", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({
      ok: true,
      trabajo: trabajo(3, "s2", "en_marcha"),
    });
    render(
      <PanelShorts
        curso="curso-ficticio"
        numero={4}
        acciones={[preparar, { ...renderizar, ultimos: {} }]}
      />,
    );

    const filaS2 = screen.getByText("s2").closest("li");
    const boton = within(filaS2!).getByRole("button", { name: "Renderizar s2" });
    expect(boton).toHaveTextContent(/^Renderizar$/);
    await userEvent.click(boton);

    expect(lanzarAccion).toHaveBeenCalledWith(
      "curso-ficticio",
      4,
      "render-short",
      { short: "s2" },
    );
  });

  it("muestra una sola vez el motivo compartido por preparar y renderizar", () => {
    const motivo = "Falta preparar los shorts";
    render(
      <PanelShorts
        curso="curso-ficticio"
        numero={4}
        acciones={[
          { ...preparar, disponible: false, motivo },
          { ...renderizar, disponible: false, motivo },
        ]}
      />,
    );

    expect(screen.getAllByText(motivo)).toHaveLength(1);
  });
});
