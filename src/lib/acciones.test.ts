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
