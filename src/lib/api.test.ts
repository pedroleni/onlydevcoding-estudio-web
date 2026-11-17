import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiNoDisponible,
  ErrorApi,
  obtenerCursos,
  obtenerLeccion,
  obtenerPublicacion,
  obtenerTeleprompter,
  obtenerTareas,
  obtenerTiposTarea,
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

  it("obtiene la vista de publicación por su ruta real", async () => {
    const vista = {
      curso: "react",
      numero: 4,
      piezas: [],
      despues_de_publicar: [],
      notas: null,
      error: null,
      guia: null,
      aviso: null,
    };
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(obtenerPublicacion("react", 4)).resolves.toEqual(vista);
    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/react/lecciones/4/publicacion",
      { cache: "no-store" },
    );
  });

  it("devuelve null si la publicación no existe", async () => {
    fetchCon(404);

    await expect(obtenerPublicacion("react", 99)).resolves.toBeNull();
  });

  it("obtiene el teleprompter por su ruta real", async () => {
    const teleprompter = {
      curso: "react",
      numero: 4,
      guion: "react-04",
      titulo: "Lección de prueba",
      version: "a".repeat(64),
      escenas: [],
      montaje: null,
      previa: {
        ruta: null,
        existe: false,
        desactualizada: false,
        version: null,
        trabajo: null,
      },
    };
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(teleprompter));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(obtenerTeleprompter("react", 4)).resolves.toEqual(teleprompter);
    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/react/lecciones/4/teleprompter",
      { cache: "no-store" },
    );
  });

  it("devuelve null si el teleprompter no existe", async () => {
    fetchCon(404);

    await expect(obtenerTeleprompter("react", 99)).resolves.toBeNull();
  });

  it("obtiene tareas con el rango y la opción de atrasadas", async () => {
    const datos = { tareas: [], atrasadas: [] };
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(datos));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(obtenerTareas("2026-11-16", "2026-11-22", true)).resolves.toEqual(datos);
    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/tareas?desde=2026-11-16&hasta=2026-11-22&atrasadas=true",
      { cache: "no-store" },
    );
  });

  it("obtiene los tipos de tarea", async () => {
    const tipos = [{ id: "otro", nombre: "Otro", color: "#9B9BA4", orden: 4 }];
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(tipos));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(obtenerTiposTarea()).resolves.toEqual(tipos);
    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/tipos-tarea",
      { cache: "no-store" },
    );
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

});
