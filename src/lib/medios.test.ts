import { describe, expect, it } from "vitest";

import { urlMedio, urlToma } from "@/lib/medios";

describe("medios de la API local", () => {
  it("codifica la ruta sin depender del cliente servidor de la API", () => {
    expect(urlMedio("cursos/REACT/a b.mp4")).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=cursos%2FREACT%2Fa%20b.mp4",
    );
  });

  it("añade la versión de la toma codificada", () => {
    expect(urlToma("grabaciones/E04.wav", 3)).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=grabaciones%2FE04.wav&v=3",
    );
    expect(urlToma("grabaciones/E04.wav", "1&ruta=otra")).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=grabaciones%2FE04.wav&v=1%26ruta%3Dotra",
    );
  });

  it("sin versión no añade el parámetro", () => {
    expect(urlToma("grabaciones/E04.wav", null)).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=grabaciones%2FE04.wav",
    );
  });
});
