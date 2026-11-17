import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { refreshSimulado } = vi.hoisted(() => ({
  refreshSimulado: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: refreshSimulado }));

import {
  cambiarEstado,
  elegirPortada,
  guardarTextos,
} from "@/lib/acciones";

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

const estadoValido = {
  estado: "pendiente" as const,
  fecha: null,
  url: null,
};

const textosValidos = {
  titulos: [],
  descripcion: null,
  etiquetas: [],
  texto: null,
  comentario_fijado: null,
  ajustes: [],
  video: null,
  notas: null,
};

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    return entrada.isDirectory() ? archivosDe(ruta) : [ruta];
  });
}

describe("Server Actions de publicación", () => {
  beforeEach(() => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-solo-para-el-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("envía el token en la cabecera y usa la ruta de publicación", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      elegirPortada(
        "react",
        4,
        "leccion",
        "cursos/REACT/04/publicar/miniatura.jpg",
      ),
    ).resolves.toEqual({ ok: true, vista });

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/react/lecciones/4/publicacion/piezas/leccion/portada",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Estudio-Token": "token-solo-para-el-test",
        },
        body: JSON.stringify({
          ruta: "cursos/REACT/04/publicar/miniatura.jpg",
        }),
        cache: "no-store",
      },
    );
    expect(refreshSimulado).toHaveBeenCalledOnce();
  });

  it("sin token devuelve un error y no llama a fetch", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "");
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      cambiarEstado("react", 4, "leccion", "youtube", {
        estado: "pendiente",
        fecha: null,
        url: null,
      }),
    ).resolves.toEqual({
      ok: false,
      mensaje: "Falta ESTUDIO_TOKEN en el .env de la web",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(refreshSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una pieza manipulada antes de llamar a fetch", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "../x", "youtube", {
        titulos: [],
        descripcion: null,
        etiquetas: [],
        texto: null,
        comentario_fijado: null,
        ajustes: [],
        video: null,
        notas: null,
      }),
    ).resolves.toEqual({ ok: false, mensaje: "La pieza no es válida" });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["cambiarEstado sin red", () => (cambiarEstado as CallableFunction)("react", 4, "leccion")],
    ["cambiarEstado con red undefined", () => cambiarEstado("react", 4, "leccion", undefined as unknown as string, estadoValido)],
    ["cambiarEstado con red desconocida", () => cambiarEstado("react", 4, "leccion", "x", estadoValido)],
    ["guardarTextos sin red", () => (guardarTextos as CallableFunction)("react", 4, "leccion")],
    ["guardarTextos con red undefined", () => guardarTextos("react", 4, "leccion", undefined as unknown as string, textosValidos)],
    ["guardarTextos con red desconocida", () => guardarTextos("react", 4, "leccion", "x", textosValidos)],
  ])("rechaza %s antes de llamar a fetch", async (_caso, ejecutarAccion) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(ejecutarAccion()).resolves.toEqual({
      ok: false,
      mensaje: "La red no es válida",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("envía solo los campos permitidos y descarta extras incluso si contienen BigInt", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    await cambiarEstado("react", 4, "leccion", "youtube", {
      ...estadoValido,
      extra: BigInt(1),
    } as typeof estadoValido);
    await guardarTextos("react", 4, "leccion", "youtube", {
      ...textosValidos,
      extra: BigInt(1),
    } as typeof textosValidos);

    expect(JSON.parse(fetchSimulado.mock.calls[0][1].body)).toEqual(estadoValido);
    expect(JSON.parse(fetchSimulado.mock.calls[1][1].body)).toEqual(textosValidos);
  });

  it("rechaza rutas de portada de más de 500 caracteres", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      elegirPortada("react", 4, "leccion", "a".repeat(501)),
    ).resolves.toEqual({
      ok: false,
      mensaje: "La ruta de la portada supera los 500 caracteres",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["texto", { texto: "a".repeat(2201) }, "El campo texto supera los 2200 caracteres"],
    ["comentario_fijado", { comentario_fijado: "a".repeat(10001) }, "El campo comentario_fijado supera los 10000 caracteres"],
    ["ajustes por líneas", { ajustes: Array.from({ length: 31 }, () => "a") }, "El campo ajustes supera las 30 líneas"],
    ["ajustes por longitud", { ajustes: ["a".repeat(301)] }, "El campo ajustes contiene una línea de más de 300 caracteres"],
  ])("aplica el límite de %s y nombra el campo", async (_campo, cambio, mensaje) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "leccion", "instagram", {
        ...textosValidos,
        ...cambio,
      }),
    ).resolves.toEqual({ ok: false, mensaje });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["titulos", { titulos: ["a".repeat(101)] }, "El campo titulos supera los 100 caracteres"],
    ["descripcion", { descripcion: "a".repeat(5001) }, "El campo descripcion supera los 5000 caracteres"],
    ["etiquetas", { etiquetas: ["a".repeat(499), "b"] }, "El campo etiquetas supera los 500 caracteres"],
  ])("aplica el límite de YouTube a %s", async (_campo, cambio, mensaje) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "leccion", "youtube", {
        ...textosValidos,
        ...cambio,
      }),
    ).resolves.toEqual({ ok: false, mensaje });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("no aplica los límites exclusivos de YouTube a Instagram", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "leccion", "instagram", {
        ...textosValidos,
        titulos: ["a".repeat(101)],
        descripcion: "a".repeat(5001),
        etiquetas: ["a".repeat(501)],
      }),
    ).resolves.toEqual({ ok: true, vista });
    expect(fetchSimulado).toHaveBeenCalledOnce();
  });

  it("aplica a LinkedIn el límite de 3000 caracteres del campo texto", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "leccion", "linkedin", {
        ...textosValidos,
        texto: "a".repeat(3001),
      }),
    ).resolves.toEqual({
      ok: false,
      mensaje: "El campo texto supera los 3000 caracteres",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo JSON de más de 256 KB", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      guardarTextos("react", 4, "leccion", "youtube", {
        ...textosValidos,
        video: "á".repeat(131_073),
      }),
    ).resolves.toEqual({
      ok: false,
      mensaje: "El cuerpo supera el límite de 256 KB",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("traduce un 409 a un mensaje en castellano", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { detail: "Arregla publicacion.json antes de editar desde la app" },
          { status: 409 },
        ),
      ),
    );

    const resultado = await guardarTextos(
      "react",
      4,
      "leccion",
      "youtube",
      {
        titulos: [],
        descripcion: null,
        etiquetas: [],
        texto: null,
        comentario_fijado: null,
        ajustes: [],
        video: null,
        notas: null,
      },
    );

    expect(resultado).toEqual({
      ok: false,
      mensaje: "No se puede guardar: publicacion.json está corrupto",
    });
    expect(refreshSimulado).not.toHaveBeenCalled();
  });

  it("muestra el detalle textual de un 422 y oculta la lista de FastAPI", async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ detail: "La fecha no puede estar en el pasado" }, { status: 422 }),
      )
      .mockResolvedValueOnce(
        Response.json({ detail: [{ loc: ["body", "fecha"], msg: "invalid" }] }, { status: 422 }),
      );
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      cambiarEstado("react", 4, "leccion", "youtube", estadoValido),
    ).resolves.toEqual({ ok: false, mensaje: "La fecha no puede estar en el pasado" });
    await expect(
      cambiarEstado("react", 4, "leccion", "youtube", estadoValido),
    ).resolves.toEqual({ ok: false, mensaje: "Los datos enviados no son válidos" });
  });

  it("traduce el 411 de la API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ detail: "Longitud requerida" }, { status: 411 })),
    );

    await expect(
      cambiarEstado("react", 4, "leccion", "youtube", estadoValido),
    ).resolves.toEqual({
      ok: false,
      mensaje: "La API requiere conocer el tamaño de la petición",
    });
  });

  it("no confunde un fallo de refresh con una respuesta no válida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(vista)));
    refreshSimulado.mockImplementationOnce(() => {
      throw new Error("fallo de refresh");
    });

    await expect(
      cambiarEstado("react", 4, "leccion", "youtube", estadoValido),
    ).rejects.toThrow("fallo de refresh");
  });

  it("registra un fallo inesperado sin incluir token ni cuerpo", async () => {
    const errorSimulado = new TypeError("fetch failed");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(errorSimulado));
    const errorDeConsola = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      guardarTextos("react", 4, "leccion", "youtube", {
        ...textosValidos,
        notas: "contenido privado del cuerpo",
      }),
    ).resolves.toEqual({ ok: false, mensaje: "No se puede conectar con la API" });

    expect(errorDeConsola).toHaveBeenCalledOnce();
    const registro = JSON.stringify(errorDeConsola.mock.calls);
    expect(registro).toContain("TypeError");
    expect(registro).not.toContain("token-solo-para-el-test");
    expect(registro).not.toContain("contenido privado del cuerpo");
  });

  it("no menciona el token en ningún módulo cliente", () => {
    const clienteConToken = archivosDe(join(process.cwd(), "src"))
      .filter((ruta) => /\.[cm]?[jt]sx?$/.test(ruta))
      .filter((ruta) => {
        const contenido = readFileSync(ruta, "utf8");
        return /^\s*["']use client["'];?/m.test(contenido) &&
          contenido.includes("ESTUDIO_TOKEN");
      });

    expect(clienteConToken).toEqual([]);
  });
});
