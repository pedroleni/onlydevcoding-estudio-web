import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { escribirSimulado, headersSimulados, refreshSimulado } = vi.hoisted(() => ({
  escribirSimulado: vi.fn(),
  headersSimulados: vi.fn(),
  refreshSimulado: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: refreshSimulado }));
vi.mock("next/headers", () => ({ headers: headersSimulados }));
vi.mock("@/lib/api-escritura", () => ({ escribir: escribirSimulado }));

import {
  generarPreviaGrabacion,
  guardarTextos,
} from "@/lib/acciones-teleprompter";

const teleprompter = {
  curso: "react",
  numero: 4,
  guion: "react-04",
  titulo: "Lección de prueba",
  version: "b".repeat(64),
  ganchos: [],
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

describe("Server Actions del teleprompter", () => {
  beforeEach(() => {
    headersSimulados.mockResolvedValue(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    }));
    escribirSimulado.mockResolvedValue({
      ok: true,
      respuesta: Response.json(teleprompter),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rechaza un texto con salto de línea antes de escribir", async () => {
    await expect(guardarTextos("react", 4, "a".repeat(64), [
      { id: "E01", cues: ["Primera línea\nSegunda línea"] },
    ])).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("devuelve el detail de un 409 y marca el conflicto", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        { detail: "El guion ha cambiado fuera de la app. Recarga antes de guardar." },
        { status: 409 },
      ),
    });

    await expect(guardarTextos("react", 4, "a".repeat(64), [
      { id: "E01", cues: ["Texto válido"] },
    ])).resolves.toEqual({
      ok: false,
      mensaje: "El guion ha cambiado fuera de la app. Recarga antes de guardar.",
      conflicto: true,
    });
  });

  it("el 409 de una lección en preparación es un error normal, sin conflicto", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        {
          detail:
            "No se puede cambiar mientras se prepara esta lección. Espera a que termine el trabajo.",
        },
        { status: 409 },
      ),
    });

    await expect(guardarTextos("react", 4, "a".repeat(64), [
      { id: "E01", cues: ["Texto válido"] },
    ])).resolves.toEqual({
      ok: false,
      mensaje:
        "No se puede cambiar mientras se prepara esta lección. Espera a que termine el trabajo.",
    });
  });

  it("reconstruye y recorta un cuerpo válido antes de escribir", async () => {
    await expect(guardarTextos("react", 4, "a".repeat(64), [
      {
        id: "E01",
        cues: ["  Texto válido  "],
        extra: BigInt(1),
      },
      { id: "E02", puntos: ["  Idea clave  "] },
    ] as never)).resolves.toEqual({ ok: true, teleprompter });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/guion/textos",
      {
        version: "a".repeat(64),
        escenas: [
          { id: "E01", cues: ["Texto válido"] },
          { id: "E02", puntos: ["Idea clave"] },
        ],
      },
      "PUT",
    );
    expect(refreshSimulado).toHaveBeenCalledOnce();
  });

  it("acepta escenas vacías si envía todos los ganchos", async () => {
    await expect(guardarTextos("react", 4, "a".repeat(64), [], [
      { id: "gancho-1", texto: "  Texto de gancho válido  " },
      { id: "gancho_2", texto: "Otro texto válido" },
    ])).resolves.toEqual({ ok: true, teleprompter });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/guion/textos",
      {
        version: "a".repeat(64),
        escenas: [],
        ganchos: [
          { id: "gancho-1", texto: "Texto de gancho válido" },
          { id: "gancho_2", texto: "Otro texto válido" },
        ],
      },
      "PUT",
    );
  });

  it.each([
    ["ningún gancho", []],
    ["más de 20 ganchos", Array.from({ length: 21 }, (_, i) => ({ id: `g-${i}`, texto: "Texto" }))],
    ["un id inválido", [{ id: "gancho/1", texto: "Texto" }]],
    ["un id demasiado largo", [{ id: "g".repeat(41), texto: "Texto" }]],
    ["un texto vacío", [{ id: "gancho-1", texto: "  " }]],
    ["un salto", [{ id: "gancho-1", texto: "Primera\nsegunda" }]],
  ])("rechaza %s antes de escribir", async (_caso, ganchos) => {
    await expect(guardarTextos("react", 4, "a".repeat(64), [], ganchos)).resolves.toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una lista de textos con huecos antes de escribir", async () => {
    const cues = Array<string>(2);
    cues[1] = "Texto válido";

    await expect(guardarTextos("react", 4, "a".repeat(64), [
      { id: "E01", cues },
    ])).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("lee cada índice una sola vez y copia la lista recibida", async () => {
    let lecturas = 0;
    const cues = ["valor provisional"];
    Object.defineProperty(cues, 0, {
      enumerable: true,
      configurable: true,
      get() {
        lecturas += 1;
        return lecturas === 1 ? "  Texto estable  " : "Texto\ninválido";
      },
    });

    await expect(guardarTextos("react", 4, "a".repeat(64), [
      { id: "E01", cues },
    ])).resolves.toEqual({ ok: true, teleprompter });

    expect(lecturas).toBe(1);
    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/guion/textos",
      {
        version: "a".repeat(64),
        escenas: [{ id: "E01", cues: ["Texto estable"] }],
      },
      "PUT",
    );
  });

  it.each([
    ["una versión inválida", "x".repeat(64), [{ id: "E01", cues: ["Texto"] }]],
    ["ninguna escena", "a".repeat(64), []],
    ["más de 200 escenas", "a".repeat(64), Array.from({ length: 201 }, (_, indice) => ({
      id: `E${String((indice % 99) + 1).padStart(2, "0")}`,
      cues: ["Texto"],
    }))],
    ["un id inválido", "a".repeat(64), [{ id: "E1", cues: ["Texto"] }]],
    ["un control Unicode", "a".repeat(64), [{ id: "E01", cues: ["Texto\u0085otro"] }]],
    ["un texto vacío", "a".repeat(64), [{ id: "E01", cues: ["   "] }]],
    ["un texto demasiado largo", "a".repeat(64), [{ id: "E01", cues: ["a".repeat(1001)] }]],
    ["más de 200 textos", "a".repeat(64), [{ id: "E01", cues: Array(201).fill("Texto") }]],
    ["hexadecimal en mayúsculas", "A".repeat(64), [{ id: "E01", cues: ["Texto"] }]],
  ])("rechaza %s antes de escribir", async (_caso, version, escenas) => {
    await expect(guardarTextos("react", 4, version, escenas)).resolves.toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("muestra el detail de un 409 al generar la previa", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        { detail: "Ya hay un trabajo en marcha" },
        { status: 409 },
      ),
    });

    await expect(generarPreviaGrabacion("react", 4)).resolves.toEqual({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/cursos/react/lecciones/4/previa-grabacion",
      {},
      "POST",
    );
  });

  it("solo muestra detail JSON en 404, 409 y 422", async () => {
    escribirSimulado
      .mockResolvedValueOnce({
        ok: true,
        respuesta: Response.json({ detail: "No existe la lección" }, { status: 404 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        respuesta: new Response("detalle interno en bruto", { status: 422 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        respuesta: Response.json({ detail: "detalle interno del servidor" }, { status: 500 }),
      });

    await expect(generarPreviaGrabacion("react", 4)).resolves.toEqual({
      ok: false,
      mensaje: "No existe la lección",
    });
    await expect(generarPreviaGrabacion("react", 4)).resolves.toEqual({
      ok: false,
      mensaje: "Los datos enviados no son válidos",
    });
    await expect(generarPreviaGrabacion("react", 4)).resolves.toEqual({
      ok: false,
      mensaje: "La API ha rechazado la petición",
    });
  });

  it("bloquea un origen ajeno antes de escribir", async () => {
    headersSimulados.mockResolvedValueOnce(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://sitio.ejemplo:3000",
    }));

    await expect(generarPreviaGrabacion("react", 4)).resolves.toEqual({
      ok: false,
      mensaje: "Origen no permitido",
    });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });
});
