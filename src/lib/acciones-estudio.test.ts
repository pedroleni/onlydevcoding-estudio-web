import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { escribirSimulado, headersSimulados } = vi.hoisted(() => ({
  escribirSimulado: vi.fn(),
  headersSimulados: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersSimulados }));
vi.mock("@/lib/api-escritura", () => ({ escribir: escribirSimulado }));

import { cancelarTrabajo, lanzarAccion } from "@/lib/acciones-estudio";

const trabajo = {
  id: 31,
  accion: "render-short",
  curso: "react",
  numero: 4,
  objetivo: "s1",
  estado: "en_marcha" as const,
  progreso: 0,
  inicio: "2026-11-18T10:00:00Z",
  fin: null,
  error: null,
};

describe("Server Actions de las acciones del estudio", () => {
  beforeEach(() => {
    headersSimulados.mockResolvedValue(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    }));
    escribirSimulado.mockResolvedValue({
      ok: true,
      respuesta: Response.json(trabajo, { status: 202 }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza una acción fuera del catálogo antes de escribir", async () => {
    await expect(
      lanzarAccion("react", 4, "borrar-todo" as never, {}),
    ).resolves.toEqual({ ok: false, mensaje: "La acción no es válida" });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una opción short manipulada antes de escribir", async () => {
    await expect(
      lanzarAccion("react", 4, "render-short", { short: "s1;rm" }),
    ).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una previa que no sea un nombre permitido antes de escribir", async () => {
    await expect(
      lanzarAccion("react", 4, "video-final", { previa: "../../x.mp4" }),
    ).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("devuelve el detail de un 409", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        { detail: "Ya hay un trabajo en marcha" },
        { status: 409 },
      ),
    });

    await expect(
      lanzarAccion("react", 4, "alinear-voz", {}),
    ).resolves.toEqual({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
  });

  it("reconstruye las opciones y lanza una acción válida", async () => {
    await expect(
      lanzarAccion("react", 4, "render-short", {
        short: "s1",
        extra: "no se envía",
      } as never),
    ).resolves.toEqual({ ok: true, trabajo });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/acciones/render-short",
      { short: "s1" },
      "POST",
    );
  });

  it("manda la escena de mejorar-toma", async () => {
    await lanzarAccion("react", 4, "mejorar-toma", { escena: "E17" });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/acciones/mejorar-toma",
      { escena: "E17" },
      "POST",
    );
  });

  it.each(["E1", "e17", "E17;rm", "../E17"])(
    "rechaza la escena manipulada %j antes de escribir",
    async (escena) => {
      await expect(
        lanzarAccion("react", 4, "mejorar-toma", { escena }),
      ).resolves.toEqual({ ok: false, mensaje: "Las opciones de la acción no son válidas" });

      expect(escribirSimulado).not.toHaveBeenCalled();
    },
  );

  it("manda el gancho de color-ganchos", async () => {
    await lanzarAccion("react", 4, "color-ganchos", { gancho: "S2" });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/acciones/color-ganchos",
      { gancho: "S2" },
      "POST",
    );
  });

  it.each(["gancho_final-2", "A".repeat(40)])("acepta el gancho %j", async (gancho) => {
    await lanzarAccion("react", 4, "color-ganchos", { gancho });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/acciones/color-ganchos",
      { gancho },
      "POST",
    );
  });

  it.each(["", "A".repeat(41), "S2;rm", "../S2", "S 2", "S2/x", "ñ"])(
    "rechaza el gancho manipulado %j antes de escribir",
    async (gancho) => {
      await expect(
        lanzarAccion("react", 4, "color-ganchos", { gancho }),
      ).resolves.toEqual({ ok: false, mensaje: "Las opciones de la acción no son válidas" });

      expect(escribirSimulado).not.toHaveBeenCalled();
    },
  );

  it("rechaza un gancho que no es texto", async () => {
    await expect(
      lanzarAccion("react", 4, "color-ganchos", { gancho: 2 } as unknown as { gancho: string }),
    ).resolves.toEqual({ ok: false, mensaje: "Las opciones de la acción no son válidas" });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it.each(["identificar-tomas"] as const)(
    "lanza %s sin opciones",
    async (accion) => {
      await expect(lanzarAccion("react", 4, accion, {})).resolves.toEqual({ ok: true, trabajo });

      expect(escribirSimulado).toHaveBeenCalledWith(
        `/api/cursos/react/lecciones/4/acciones/${accion}`,
        {},
        "POST",
      );
    },
  );

  it("solo manda las claves opcionales presentes", async () => {
    await lanzarAccion("react", 4, "alinear-voz", {});

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/acciones/alinear-voz",
      {},
      "POST",
    );
  });

  it("valida el id antes de cancelar y usa un cuerpo vacío", async () => {
    await expect(cancelarTrabajo(Number.MAX_SAFE_INTEGER + 1)).resolves.toEqual({
      ok: false,
      mensaje: "El trabajo no es válido",
    });
    expect(escribirSimulado).not.toHaveBeenCalled();

    await expect(cancelarTrabajo(31)).resolves.toEqual({ ok: true, trabajo });
    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/trabajos/31/cancelar",
      {},
      "POST",
    );
  });

  it.each([
    ["un origen ajeno", { host: "127.0.0.1:3000", origin: "http://sitio.ejemplo:3000" }],
    ["un host ajeno", { host: "sitio.ejemplo:3000", origin: "http://127.0.0.1:3000" }],
    ["sin origen", { host: "127.0.0.1:3000" }],
  ])("lanzarAccion rechaza %s sin escribir", async (_caso, cabeceras) => {
    headersSimulados.mockResolvedValueOnce(new Headers(cabeceras));

    await expect(lanzarAccion("react", 4, "alinear-voz", {})).resolves.toEqual({
      ok: false,
      mensaje: "Origen no permitido",
    });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["un origen ajeno", { host: "127.0.0.1:3000", origin: "http://sitio.ejemplo:3000" }],
    ["un host ajeno", { host: "sitio.ejemplo:3000", origin: "http://127.0.0.1:3000" }],
    ["sin origen", { host: "127.0.0.1:3000" }],
  ])("cancelarTrabajo rechaza %s sin escribir", async (_caso, cabeceras) => {
    headersSimulados.mockResolvedValueOnce(new Headers(cabeceras));

    await expect(cancelarTrabajo(31)).resolves.toEqual({
      ok: false,
      mensaje: "Origen no permitido",
    });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("devuelve el detail de un 404 al cancelar un trabajo inexistente", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json({ detail: "El trabajo no existe" }, { status: 404 }),
    });

    await expect(cancelarTrabajo(999)).resolves.toEqual({
      ok: false,
      mensaje: "El trabajo no existe",
    });
  });

  it("devuelve el detail del 409 de una lección sin guion", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        { detail: "Esta lección aún no tiene guion" },
        { status: 409 },
      ),
    });

    await expect(lanzarAccion("react", 4, "preparar-montaje", {})).resolves.toEqual({
      ok: false,
      mensaje: "Esta lección aún no tiene guion",
    });
  });
});
