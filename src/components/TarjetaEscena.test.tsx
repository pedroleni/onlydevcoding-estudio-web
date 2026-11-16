import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TarjetaEscena } from "@/components/TarjetaEscena";
import type { Escena } from "@/lib/tipos";

const escena: Escena = {
  id: "escena-falsa",
  modo: "camara",
  tipo: "introduccion",
  titulo: "Una escena de prueba",
  textos: ["Texto completamente ficticio para la prueba."],
  inicio_s: null,
  duracion_s: null,
};

describe("TarjetaEscena", () => {
  it("salta al segundo de la escena", () => {
    render(
      <TarjetaEscena
        escena={{ ...escena, inicio_s: 32 }}
        previa="cursos/curso-falso/previa.mp4"
      />,
    );

    expect(document.querySelector("video")?.getAttribute("src")).toMatch(
      /#t=33$/,
    );
  });
});
