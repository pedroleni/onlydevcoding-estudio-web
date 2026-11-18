import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GrabacionesVoz } from "@/components/GrabacionesVoz";
import { urlToma } from "@/lib/medios";
import type { EstadoAccion, EscenaTeleprompter } from "@/lib/tipos";

vi.mock("@/components/acciones/BotonAccion", () => ({
  BotonAccion: ({ accion }: { accion: EstadoAccion }) => (
    <button>{accion.etiqueta}</button>
  ),
}));

const accion: EstadoAccion = {
  id: "alinear-voz",
  etiqueta: "Alinear la voz",
  disponible: true,
  motivo: null,
  opciones: [],
  ultimo: null,
  ultimos: {},
};

const escenas: EscenaTeleprompter[] = [
  {
    id: "E03",
    modo: "voz",
    titulo: "Escena grabada",
    cues: [],
    puntos: [],
    grabada: true,
    toma: "tomas/curso-ficticio/E03-voz.wav",
    version_toma: 7,
  },
  {
    id: "E04",
    modo: "voz",
    titulo: "Escena pendiente",
    cues: [],
    puntos: [],
    grabada: false,
    toma: null,
    version_toma: null,
  },
];

describe("GrabacionesVoz", () => {
  it("muestra el audio versionado de las tomas y las escenas sin grabar", () => {
    render(
      <GrabacionesVoz
        curso="curso-ficticio"
        numero={4}
        escenas={escenas}
        avance={{ hechas: 1, total: 2 }}
        sinAlinear={["E03"]}
        accion={accion}
      />,
    );

    expect(screen.getByRole("button", { name: "Alinear la voz" })).toBeInTheDocument();
    expect(screen.getByText(/Voz sin alinear:/)).toHaveTextContent("E03");
    expect(screen.getByLabelText("Toma de E03")).toHaveAttribute(
      "src",
      urlToma("tomas/curso-ficticio/E03-voz.wav", 7),
    );
    expect(screen.getByLabelText("Toma de E03")).toHaveAttribute("preload", "none");
    expect(screen.getByText("E04").closest("li")).toHaveTextContent("Sin grabar");
  });
});
