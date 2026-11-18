import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AvisoMontaje } from "@/components/guion/AvisoMontaje";
import type { EstadoAccion, EstadoMontaje } from "@/lib/tipos";

vi.mock("@/components/acciones/BotonAccion", () => ({
  BotonAccion: ({ accion }: { accion: EstadoAccion }) => <button>{accion.etiqueta}</button>,
}));

const acciones: EstadoAccion[] = [
  {
    id: "alinear-voz",
    etiqueta: "Alinear la voz",
    disponible: true,
    motivo: null,
    opciones: [],
    ultimo: null,
    ultimos: {},
  },
  {
    id: "preparar-montaje",
    etiqueta: "Preparar el montaje",
    disponible: true,
    motivo: null,
    opciones: [],
    ultimo: null,
    ultimos: {},
  },
];

function montaje(estado: EstadoMontaje["estado"], sin_alinear: string[] = []): EstadoMontaje {
  return { estado, sin_alinear };
}

describe("AvisoMontaje", () => {
  it.each([
    ["guion_cambiado", [], "Guion cambiado: hay que regenerar el montaje.", "Preparar el montaje"],
    ["voz_sin_alinear", ["E03", "E05"], "Voz sin alinear: E03, E05.", "Alinear la voz"],
    ["sin_montaje", [], "Esta lección aún no tiene montaje.", "Preparar el montaje"],
  ] as const)("muestra el estado %s con su acción", (estado, sinAlinear, texto, boton) => {
    render(
      <AvisoMontaje
        curso="react"
        numero={4}
        montaje={montaje(estado, [...sinAlinear])}
        acciones={acciones}
      />,
    );

    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: boton })).toBeInTheDocument();
  });

  it("no muestra nada cuando el montaje está al día", () => {
    const { container } = render(
      <AvisoMontaje curso="react" numero={4} montaje={montaje("al_dia")} acciones={acciones} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el aviso sin botón si no se pudieron obtener acciones", () => {
    render(
      <AvisoMontaje
        curso="react"
        numero={4}
        montaje={montaje("guion_cambiado")}
        acciones={null}
      />,
    );

    expect(screen.getByText("Guion cambiado: hay que regenerar el montaje.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
