import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiNoDisponible,
  obtenerCursos,
  obtenerLeccion,
  urlMedio,
} from "@/lib/api";

function fetchFalla() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
}

function fetchCon(status: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(null, {
        status,
      }),
    ),
  );
}

describe("cliente de la API local", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lanza ApiNoDisponible si la API no responde", async () => {
    fetchFalla();

    await expect(obtenerCursos()).rejects.toBeInstanceOf(ApiNoDisponible);
  });

  it("devuelve null en 404", async () => {
    fetchCon(404);

    expect(await obtenerLeccion("react", 99)).toBeNull();
  });

  it("urlMedio codifica la ruta", () => {
    expect(urlMedio("cursos/REACT/a b.mp4")).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=cursos%2FREACT%2Fa%20b.mp4",
    );
  });
});
