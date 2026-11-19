import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { headersSimulados, refreshSimulado } = vi.hoisted(() => ({
  headersSimulados: vi.fn(),
  refreshSimulado: vi.fn(),
}));
vi.mock("next/cache", () => ({ refresh: refreshSimulado }));
vi.mock("next/headers", () => ({ headers: headersSimulados }));

import {
  cambiarEstado,
  elegirPortada,
  guardarTextos,
} from "@/lib/acciones";
import type { TextosEditables } from "@/lib/tipos";

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
  notas: null,
};

const DESTINO_YOUTUBE = {
  curso: "react",
  numero: 4,
  pieza: "leccion",
  red: "youtube",
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
    headersSimulados.mockResolvedValue(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    }));
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
        redirect: "error",
      },
    );
    expect(refreshSimulado).toHaveBeenCalledOnce();
  });

  it("impide que fetch siga redirecciones con el token de escritura", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    await elegirPortada("react", 4, "leccion", "portadas/miniatura.jpg");

    expect(fetchSimulado).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ redirect: "error" }),
    );
  });

  it("sin token devuelve un error y no llama a fetch", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "");
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      cambiarEstado(DESTINO_YOUTUBE, {
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
      guardarTextos({ ...DESTINO_YOUTUBE, pieza: "../x" }, {
        titulos: [],
        descripcion: null,
        etiquetas: [],
        texto: null,
        comentario_fijado: null,
        ajustes: [],
        notas: null,
      }),
    ).resolves.toEqual({ ok: false, mensaje: "La pieza no es válida" });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una URL de publicación peligrosa antes de llamar a fetch", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(
      cambiarEstado(DESTINO_YOUTUBE, {
        estado: "publicado",
        fecha: null,
        url: "javascript:alert(1)",
      }),
    ).resolves.toEqual({ ok: false, mensaje: "El estado no es válido" });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  const accionesValidas = [
    ["elegirPortada", () => elegirPortada("react", 4, "leccion", "portadas/miniatura.jpg")],
    ["cambiarEstado", () => cambiarEstado(DESTINO_YOUTUBE, estadoValido)],
    ["guardarTextos", () => guardarTextos(DESTINO_YOUTUBE, textosValidos)],
  ] as const;

  it.each(accionesValidas)(
    "bloquea %s con un host ajeno antes de llamar a fetch",
    async (_nombre, ejecutarAccion) => {
      headersSimulados.mockResolvedValueOnce(new Headers({
        host: "sitio.ejemplo:3000",
        origin: "http://127.0.0.1:3000",
      }));
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(ejecutarAccion()).resolves.toEqual({
        ok: false,
        mensaje: "Origen no permitido",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it.each(accionesValidas)(
    "bloquea %s con un origin ajeno antes de llamar a fetch",
    async (_nombre, ejecutarAccion) => {
      headersSimulados.mockResolvedValueOnce(new Headers({
        host: "127.0.0.1:3000",
        origin: "http://sitio.ejemplo:3000",
      }));
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      await expect(ejecutarAccion()).resolves.toEqual({
        ok: false,
        mensaje: "Origen no permitido",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["cambiarEstado sin red", () => cambiarEstado({ curso: "react", numero: 4, pieza: "leccion" }, estadoValido)],
    ["cambiarEstado con red undefined", () => cambiarEstado({ ...DESTINO_YOUTUBE, red: undefined }, estadoValido)],
    ["cambiarEstado con red desconocida", () => cambiarEstado({ ...DESTINO_YOUTUBE, red: "x" }, estadoValido)],
    ["guardarTextos sin red", () => guardarTextos({ curso: "react", numero: 4, pieza: "leccion" }, textosValidos)],
    ["guardarTextos con red undefined", () => guardarTextos({ ...DESTINO_YOUTUBE, red: undefined }, textosValidos)],
    ["guardarTextos con red desconocida", () => guardarTextos({ ...DESTINO_YOUTUBE, red: "x" }, textosValidos)],
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

    await cambiarEstado(DESTINO_YOUTUBE, {
      ...estadoValido,
      extra: BigInt(1),
    } as typeof estadoValido);
    await guardarTextos(DESTINO_YOUTUBE, {
      ...textosValidos,
      extra: BigInt(1),
    } as typeof textosValidos);

    expect(JSON.parse(fetchSimulado.mock.calls[0][1].body)).toEqual(estadoValido);
    expect(JSON.parse(fetchSimulado.mock.calls[1][1].body)).toEqual(textosValidos);
  });

  it("no envía video al guardar textos aunque el objeto de entrada lo incluya", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(vista));
    vi.stubGlobal("fetch", fetchSimulado);

    const textosConVideo: TextosEditables & { video: string } = {
      ...textosValidos,
      video: "videos/no-debe-salir.mp4",
    };
    await guardarTextos(DESTINO_YOUTUBE, textosConVideo);

    expect(JSON.parse(fetchSimulado.mock.calls[0][1].body)).toEqual(textosValidos);
    expect(fetchSimulado.mock.calls[0][1].body).not.toContain("video");
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
      guardarTextos({ ...DESTINO_YOUTUBE, red: "instagram" }, {
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
      guardarTextos(DESTINO_YOUTUBE, {
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
      guardarTextos({ ...DESTINO_YOUTUBE, red: "instagram" }, {
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
      guardarTextos({ ...DESTINO_YOUTUBE, red: "linkedin" }, {
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
      guardarTextos({ ...DESTINO_YOUTUBE, red: "instagram" }, {
        ...textosValidos,
        titulos: Array.from({ length: 140_000 }, () => "á"),
      }),
    ).resolves.toEqual({
      ok: false,
      mensaje: "El cuerpo supera el límite de 256 KB",
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("muestra el detalle textual de un 409 y conserva el mensaje genérico sin él", async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json(
          { detail: "Arregla publicacion.json antes de editar desde la app" },
          { status: 409 },
        ),
      )
      .mockResolvedValueOnce(
        Response.json({ detail: { motivo: "contenido no mostrable" } }, { status: 409 }),
      );
    vi.stubGlobal("fetch", fetchSimulado);

    await expect(guardarTextos(
      DESTINO_YOUTUBE,
      textosValidos,
    )).resolves.toEqual({
      ok: false,
      mensaje: "Arregla publicacion.json antes de editar desde la app",
    });
    await expect(guardarTextos(
      DESTINO_YOUTUBE,
      textosValidos,
    )).resolves.toEqual({
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
      cambiarEstado(DESTINO_YOUTUBE, estadoValido),
    ).resolves.toEqual({ ok: false, mensaje: "La fecha no puede estar en el pasado" });
    await expect(
      cambiarEstado(DESTINO_YOUTUBE, estadoValido),
    ).resolves.toEqual({ ok: false, mensaje: "Los datos enviados no son válidos" });
  });

  it("traduce el 411 de la API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ detail: "Longitud requerida" }, { status: 411 })),
    );

    await expect(
      cambiarEstado(DESTINO_YOUTUBE, estadoValido),
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
      cambiarEstado(DESTINO_YOUTUBE, estadoValido),
    ).rejects.toThrow("fallo de refresh");
  });

  it("registra un fallo inesperado sin incluir token ni cuerpo", async () => {
    const errorSimulado = new TypeError("fetch failed");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(errorSimulado));
    const errorDeConsola = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      guardarTextos(DESTINO_YOUTUBE, {
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
