import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { escribirSimulado, headersSimulados } = vi.hoisted(() => ({
  escribirSimulado: vi.fn(),
  headersSimulados: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: headersSimulados }));
vi.mock("@/lib/api-escritura", () => ({
  escribir: escribirSimulado,
  urlApi: () => "http://127.0.0.1:8000",
}));

import { colocarTomas, leerEntregas, quitarEntrega } from "@/lib/acciones-entregas";

const entregas = {
  archivos: [{ archivo: "Toma ficticia.MOV", bytes: 10 }],
  propuesta: null,
  destinos: { camara: [], ganchos: [] },
};

describe("Server Actions de las entregas", () => {
  beforeEach(() => {
    headersSimulados.mockResolvedValue(
      new Headers({ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" }),
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  describe("leerEntregas", () => {
    it("lee las entregas de la lección", async () => {
      const fetchSimulado = vi.fn().mockResolvedValue(Response.json(entregas));
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(leerEntregas("react", 4)).resolves.toEqual({ ok: true, entregas });
      expect(fetchSimulado).toHaveBeenCalledWith(
        "http://127.0.0.1:8000/api/cursos/react/lecciones/4/entregas",
        expect.objectContaining({ cache: "no-store", redirect: "error" }),
      );
    });

    it("rechaza una lección no válida y un origen ajeno sin leer", async () => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(leerEntregas("../x", 4)).resolves.toMatchObject({ ok: false });
      headersSimulados.mockResolvedValueOnce(
        new Headers({ host: "127.0.0.1:3000", origin: "http://sitio.ejemplo" }),
      );
      await expect(leerEntregas("react", 4)).resolves.toEqual({
        ok: false,
        mensaje: "Origen no permitido",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    });

    it("devuelve el detail de un error y un mensaje fijo si no hay API", async () => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            Response.json({ detail: "La lección no existe" }, { status: 404 }),
          )
          .mockRejectedValueOnce(new TypeError("fetch failed")),
      );

      await expect(leerEntregas("react", 4)).resolves.toEqual({
        ok: false,
        mensaje: "La lección no existe",
      });
      await expect(leerEntregas("react", 4)).resolves.toEqual({
        ok: false,
        mensaje: "No se puede conectar con la API",
      });
    });
  });

  describe("quitarEntrega", () => {
    it("borra la toma con DELETE y el nombre codificado", async () => {
      escribirSimulado.mockResolvedValue({
        ok: true,
        respuesta: new Response(null, { status: 204 }),
      });

      await expect(quitarEntrega("react", 4, "Toma ficticia (2).MOV")).resolves.toEqual({
        ok: true,
      });
      expect(escribirSimulado).toHaveBeenCalledWith(
        "/api/cursos/react/lecciones/4/entregas/Toma%20ficticia%20(2).MOV",
        {},
        "DELETE",
      );
    });

    it("rechaza un nombre con ruta antes de escribir", async () => {
      await expect(quitarEntrega("react", 4, "../../x.mov")).resolves.toMatchObject({
        ok: false,
      });
      expect(escribirSimulado).not.toHaveBeenCalled();
    });

    it("devuelve el detail de un 404", async () => {
      escribirSimulado.mockResolvedValue({
        ok: true,
        respuesta: Response.json({ detail: "La toma entregada no existe" }, { status: 404 }),
      });

      await expect(quitarEntrega("react", 4, "toma.mov")).resolves.toEqual({
        ok: false,
        mensaje: "La toma entregada no existe",
      });
    });
  });

  describe("colocarTomas", () => {
    const asignaciones = [
      { archivo: "toma-1.mov", destino: "E17" },
      { archivo: "toma-2.mov", destino: null },
    ];

    it("envía las asignaciones y devuelve el resultado", async () => {
      const resultado = { colocadas: [{ archivo: "toma-1.mov", destino: "E17" }], ganchos: 0 };
      escribirSimulado.mockResolvedValue({
        ok: true,
        respuesta: Response.json(resultado),
      });

      await expect(colocarTomas("react", 4, asignaciones)).resolves.toEqual({
        ok: true,
        resultado,
      });
      expect(escribirSimulado).toHaveBeenCalledWith(
        "/api/cursos/react/lecciones/4/entregas/colocar",
        { asignaciones },
        "POST",
      );
    });

    it("devuelve el detail de un 422", async () => {
      escribirSimulado.mockResolvedValue({
        ok: true,
        respuesta: Response.json(
          { detail: "Hay dos tomas para el mismo destino" },
          { status: 422 },
        ),
      });

      await expect(colocarTomas("react", 4, asignaciones)).resolves.toEqual({
        ok: false,
        mensaje: "Hay dos tomas para el mismo destino",
      });
    });

    it.each([
      ["sin lista", null],
      ["con un campo de más", [{ archivo: "toma.mov", destino: "E17", extra: 1 }]],
      ["con un nombre con ruta", [{ archivo: "../x.mov", destino: "E17" }]],
      ["con un destino que no es texto", [{ archivo: "toma.mov", destino: 17 }]],
      ["con un destino vacío", [{ archivo: "toma.mov", destino: "" }]],
      ["con un destino con ruta", [{ archivo: "toma.mov", destino: "../E17" }]],
      ["con un destino con barra", [{ archivo: "toma.mov", destino: "E17/x" }]],
      ["con un destino con espacios", [{ archivo: "toma.mov", destino: "E 17" }]],
      ["con un destino con salto de línea", [{ archivo: "toma.mov", destino: "E17\n" }]],
      ["con un destino de 41 caracteres", [{ archivo: "toma.mov", destino: "a".repeat(41) }]],
      ["con un destino no ASCII", [{ archivo: "toma.mov", destino: "escena-ñ" }]],
    ])("rechaza asignaciones %s antes de escribir", async (_caso, valor) => {
      await expect(
        colocarTomas("react", 4, valor as never),
      ).resolves.toMatchObject({ ok: false });
      expect(escribirSimulado).not.toHaveBeenCalled();
    });

    it("acepta escenas de cámara, ganchos, el cierre y un id de 40 caracteres", async () => {
      escribirSimulado.mockResolvedValue({
        ok: true,
        respuesta: Response.json({ colocadas: [], ganchos: 0 }),
      });
      const validas = [
        { archivo: "toma-1.mov", destino: "E08" },
        { archivo: "toma-2.mov", destino: "S2" },
        { archivo: "toma-3.mov", destino: "cierre" },
        { archivo: "toma-4.mov", destino: "gancho_ficticio-1" },
        { archivo: "toma-5.mov", destino: "a".repeat(40) },
        { archivo: "toma-6.mov", destino: null },
      ];

      await expect(colocarTomas("react", 4, validas)).resolves.toMatchObject({ ok: true });
      expect(escribirSimulado).toHaveBeenCalledWith(
        "/api/cursos/react/lecciones/4/entregas/colocar",
        { asignaciones: validas },
        "POST",
      );
    });

    it("rechaza un origen ajeno antes de escribir", async () => {
      headersSimulados.mockResolvedValueOnce(
        new Headers({ host: "127.0.0.1:3000", origin: "http://sitio.ejemplo" }),
      );

      await expect(colocarTomas("react", 4, asignaciones)).resolves.toEqual({
        ok: false,
        mensaje: "Origen no permitido",
      });
      expect(escribirSimulado).not.toHaveBeenCalled();
    });
  });
});
