import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { escribirSimulado } = vi.hoisted(() => ({ escribirSimulado: vi.fn() }));
vi.mock("@/lib/api-escritura", () => ({ escribir: escribirSimulado }));

import { escribirEnApi, leerJson } from "@/lib/escritura-con-detalle";

const opciones = {
  contexto: "probar la escritura",
  estadosConDetalle: new Set([409, 422]),
  mensajeEstado: (estado: number) => `Mensaje genérico ${estado}`,
};

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("escribirEnApi", () => {
  it("usa PUT por defecto y devuelve la respuesta si la API acepta", async () => {
    const respuesta = Response.json({ id: 1 });
    escribirSimulado.mockResolvedValue({ ok: true, respuesta });

    await expect(escribirEnApi("/api/ruta", { a: 1 }, opciones)).resolves.toEqual({
      ok: true,
      respuesta,
    });
    expect(escribirSimulado).toHaveBeenCalledWith("/api/ruta", { a: 1 }, "PUT");
  });

  it("si la conexión falla, registra el contexto y da un mensaje para la interfaz", async () => {
    escribirSimulado.mockRejectedValue(new TypeError("fetch failed"));
    const registro = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      escribirEnApi("/api/ruta", {}, { ...opciones, metodo: "POST" }),
    ).resolves.toEqual({ ok: false, mensaje: "No se puede conectar con la API" });
    expect(registro).toHaveBeenCalledWith("Error inesperado al probar la escritura", {
      tipo: "TypeError",
    });
  });

  it("pasa tal cual el fallo de escribir (sin token o cuerpo demasiado grande)", async () => {
    escribirSimulado.mockResolvedValue({ ok: false, mensaje: "Falta ESTUDIO_TOKEN" });

    await expect(escribirEnApi("/api/ruta", {}, opciones)).resolves.toEqual({
      ok: false,
      mensaje: "Falta ESTUDIO_TOKEN",
    });
  });

  it("enseña el detail solo en los estados de confianza, con el estado", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json({ detail: "Ya hay un trabajo en marcha" }, { status: 409 }),
    });
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json({ detail: "Traza interna" }, { status: 500 }),
    });

    await expect(escribirEnApi("/api/ruta", {}, opciones)).resolves.toEqual({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
      estado: 409,
    });
    await expect(escribirEnApi("/api/ruta", {}, opciones)).resolves.toEqual({
      ok: false,
      mensaje: "Mensaje genérico 500",
      estado: 500,
    });
  });
});

describe("leerJson", () => {
  it("devuelve el cuerpo JSON o null si es ilegible", async () => {
    await expect(leerJson(Response.json({ id: 7 }))).resolves.toEqual({ id: 7 });
    await expect(leerJson(new Response("no es json"))).resolves.toBeNull();
  });
});
