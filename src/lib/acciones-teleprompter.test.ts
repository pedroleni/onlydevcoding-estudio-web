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
