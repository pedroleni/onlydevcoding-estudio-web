import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiNoDisponible,
  ErrorApi,
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

  it("convierte un JSON inválido en ApiNoDisponible conservando la causa", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await obtenerCursos().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ApiNoDisponible);
    expect(error).toMatchObject({
      message: "Respuesta de la API no válida",
      cause: expect.any(SyntaxError),
    });
  });

  it("trata un 500 como API no disponible", async () => {
    fetchCon(500);

    await expect(obtenerCursos()).rejects.toMatchObject({
      name: "ApiNoDisponible",
      message: "No se puede conectar con la API",
    });
  });

  it("expone un 403 como rechazo de la API", async () => {
    fetchCon(403);

    const error = await obtenerCursos().catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 403 });
    expect((error as Error).message.toLowerCase()).not.toContain(
      "no se puede conectar",
    );
  });

  it("devuelve null en 404", async () => {
    fetchCon(404);

    expect(await obtenerLeccion("react", 99)).toBeNull();
  });

  it.each([Number.NaN, 1.5])(
    "no consulta la API para un número de lección inválido: %s",
    async (numero) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(obtenerLeccion("react", numero)).resolves.toBeNull();
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it("urlMedio codifica la ruta", () => {
    expect(urlMedio("cursos/REACT/a b.mp4")).toBe(
      "http://127.0.0.1:8000/api/medios?ruta=cursos%2FREACT%2Fa%20b.mp4",
    );
  });
});
