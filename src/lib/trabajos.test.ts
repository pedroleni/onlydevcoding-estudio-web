import { afterEach, describe, expect, it, vi } from "vitest";

import { leerTrabajo, TrabajoInexistente } from "@/lib/trabajos";

describe("lectura de trabajos", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("lee el trabajo desde la URL pública sin caché", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://127.0.0.1:8000/");
    const trabajo = {
      id: 7,
      accion: "previa_grabacion",
      curso: "react",
      numero: 4,
      objetivo: null,
      estado: "en_marcha",
      progreso: 0.5,
      inicio: "2026-11-17T10:00:00Z",
      fin: null,
      error: null,
    };
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(trabajo));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(leerTrabajo(7)).resolves.toEqual(trabajo);
    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/trabajos/7",
      { method: "GET", cache: "no-store" },
    );
  });

  it("lanza un error si la API no responde con 200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ detail: "Error" }, { status: 500 })),
    );

    await expect(leerTrabajo(7)).rejects.toThrow("estado 500");
  });

  it("distingue con un error propio el trabajo que ya no existe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ detail: "El trabajo no existe" }, { status: 404 })),
    );

    const error = await leerTrabajo(7).catch((causa: unknown) => causa);
    expect(error).toBeInstanceOf(TrabajoInexistente);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rechaza el id inválido %s sin hacer fetch",
    async (id) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(leerTrabajo(id)).rejects.toThrow("no es válido");
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );
});
