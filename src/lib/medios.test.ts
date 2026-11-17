import { describe, expect, it } from "vitest";

import { urlMedio } from "@/lib/medios";

describe("medios de la API local", () => {
  it("codifica la ruta sin depender del cliente servidor de la API", () => {
    expect(urlMedio("cursos/REACT/a b.mp4")).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=cursos%2FREACT%2Fa%20b.mp4",
    );
  });
});
