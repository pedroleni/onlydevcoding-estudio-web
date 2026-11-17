import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  escribirSimulado,
  headersSimulados,
  obtenerLeccionSimulado,
  obtenerLeccionesSimulado,
  refreshSimulado,
} = vi.hoisted(() => ({
  escribirSimulado: vi.fn(),
  headersSimulados: vi.fn(),
  obtenerLeccionSimulado: vi.fn(),
  obtenerLeccionesSimulado: vi.fn(),
  refreshSimulado: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: refreshSimulado }));
vi.mock("next/headers", () => ({ headers: headersSimulados }));
vi.mock("@/lib/api-escritura", () => ({ escribir: escribirSimulado }));
vi.mock("@/lib/api", () => ({
  obtenerLeccion: obtenerLeccionSimulado,
  obtenerLecciones: obtenerLeccionesSimulado,
}));

import {
  borrarCurso,
  borrarTarea,
  borrarTipoTarea,
  crearCurso,
  crearTarea,
  crearTipoTarea,
  editarTarea,
  editarTipoTarea,
  marcarHecha,
  opcionesLecciones,
  opcionesPiezas,
} from "@/lib/acciones-tareas";
import type { TareaNueva } from "@/lib/tipos";

const tareaValida: TareaNueva = {
  fecha: "2026-11-17",
  hora: "09:30",
  texto: "Preparar la lección",
  tipo: "preparar",
  enlace: {
    curso: "react",
    numero: 4,
    pieza: "leccion",
    red: "youtube",
  },
};

describe("Server Actions de tareas", () => {
  beforeEach(() => {
    headersSimulados.mockResolvedValue(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    }));
    escribirSimulado.mockResolvedValue({
      ok: true,
      respuesta: Response.json({}, { status: 201 }),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["una hora imposible", { hora: "25:00" }],
    ["la hora 24:00", { hora: "24:00" }],
    ["la hora 09:60", { hora: "09:60" }],
    ["una fecha inexistente", { fecha: "2026-02-29" }],
    ["un salto de línea", { texto: "Primera\nsegunda" }],
    ["un separador de línea Unicode", { texto: "Primera\u2028segunda" }],
    ["una red sin pieza", {
      enlace: { curso: "react", numero: 4, red: "youtube" },
    }],
  ])("rechaza %s antes de escribir", async (_caso, cambios) => {
    await expect(crearTarea({ ...tareaValida, ...cambios } as TareaNueva)).resolves
      .toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("mide la longitud del texto en puntos de código", async () => {
    await expect(crearTarea({
      ...tareaValida,
      texto: "😀".repeat(300),
    })).resolves.toEqual({ ok: true });
    await expect(crearTarea({
      ...tareaValida,
      texto: "😀".repeat(301),
    })).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).toHaveBeenCalledOnce();
  });

  it("crea una tarea con un objeto reconstruido y el texto recortado", async () => {
    await expect(crearTarea({
      ...tareaValida,
      texto: "  Preparar la lección  ",
      extra: BigInt(1),
      enlace: { ...tareaValida.enlace!, extra: BigInt(1) },
    } as TareaNueva)).resolves.toEqual({ ok: true });

    expect(escribirSimulado).toHaveBeenCalledWith(
      "/api/tareas",
      tareaValida,
      "POST",
    );
    expect(refreshSimulado).toHaveBeenCalledOnce();
  });

  it("usa las rutas y métodos de editar, marcar y borrar", async () => {
    await editarTarea(7, tareaValida);
    await marcarHecha(7, true);
    await borrarTarea(3);

    expect(escribirSimulado).toHaveBeenNthCalledWith(1, "/api/tareas/7", tareaValida, "PUT");
    expect(escribirSimulado).toHaveBeenNthCalledWith(2, "/api/tareas/7/hecha", { hecha: true }, "PUT");
    expect(escribirSimulado).toHaveBeenNthCalledWith(3, "/api/tareas/3", {}, "DELETE");
  });

  it.each([
    ["un estado no booleano", 3, "sí"],
    ["el id cero", 0, true],
    ["un id negativo", -1, true],
    ["un id decimal", 1.5, true],
    ["un id entero no seguro", 2 ** 53, true],
  ])("rechaza %s al marcar una tarea", async (_caso, id, hecha) => {
    await expect(marcarHecha(id, hecha as never)).resolves.toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["host", { host: "sitio.ejemplo:3000", origin: "http://127.0.0.1:3000" }],
    ["origin", { host: "127.0.0.1:3000", origin: "http://sitio.ejemplo:3000" }],
  ])("bloquea un %s ajeno antes de escribir", async (_caso, cabeceras) => {
    headersSimulados.mockResolvedValueOnce(new Headers(cabeceras));

    await expect(crearTarea(tareaValida)).resolves.toEqual({
      ok: false,
      mensaje: "Origen no permitido",
    });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("muestra tal cual el detail textual de un 409", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: Response.json(
        { detail: "Hay tareas de este tipo; cámbialas antes de borrarlo" },
        { status: 409 },
      ),
    });

    await expect(borrarTipoTarea("preparar")).resolves.toEqual({
      ok: false,
      mensaje: "Hay tareas de este tipo; cámbialas antes de borrarlo",
    });
    expect(refreshSimulado).not.toHaveBeenCalled();
  });

  it("trata un 204 como éxito sin leer su cuerpo", async () => {
    escribirSimulado.mockResolvedValueOnce({
      ok: true,
      respuesta: new Response(null, { status: 204 }),
    });

    await expect(borrarTarea(3)).resolves.toEqual({ ok: true });
    expect(refreshSimulado).toHaveBeenCalledOnce();
  });

  it("valida y reconstruye tipos y cursos", async () => {
    await crearTipoTarea({
      id: "revision",
      nombre: "  Revisión  ",
      color: "#299BC6",
      orden: 2,
      extra: BigInt(1),
    } as never);
    await editarTipoTarea("revision", {
      nombre: "  Revisar  ",
      color: "#6CCBEF",
      orden: 3,
      extra: BigInt(1),
    } as never);
    await borrarTipoTarea("revision");
    await crearCurso("typescript", "  TypeScript  ");
    await borrarCurso("typescript");

    expect(escribirSimulado).toHaveBeenNthCalledWith(1, "/api/tipos-tarea", {
      id: "revision", nombre: "Revisión", color: "#299BC6", orden: 2,
    }, "POST");
    expect(escribirSimulado).toHaveBeenNthCalledWith(2, "/api/tipos-tarea/revision", {
      nombre: "Revisar", color: "#6CCBEF", orden: 3,
    }, "PUT");
    expect(escribirSimulado).toHaveBeenNthCalledWith(3, "/api/tipos-tarea/revision", {}, "DELETE");
    expect(escribirSimulado).toHaveBeenNthCalledWith(4, "/api/cursos", {
      id: "typescript", nombre: "TypeScript",
    }, "POST");
    expect(escribirSimulado).toHaveBeenNthCalledWith(5, "/api/cursos/typescript", {}, "DELETE");
  });

  it.each([
    ["un color desconocido", {
      id: "revision", nombre: "Revisión", color: "#000000", orden: 2,
    }],
    ["un nombre vacío", {
      id: "revision", nombre: "   ", color: "#299BC6", orden: 2,
    }],
    ["un nombre de 41 caracteres", {
      id: "revision", nombre: "a".repeat(41), color: "#299BC6", orden: 2,
    }],
    ["un id inválido", {
      id: "Revision!", nombre: "Revisión", color: "#299BC6", orden: 2,
    }],
    ["un orden negativo", {
      id: "revision", nombre: "Revisión", color: "#299BC6", orden: -1,
    }],
    ["un orden superior a 10000", {
      id: "revision", nombre: "Revisión", color: "#299BC6", orden: 10_001,
    }],
    ["un orden decimal", {
      id: "revision", nombre: "Revisión", color: "#299BC6", orden: 1.5,
    }],
  ])("rechaza tipos con %s", async (_caso, tipo) => {
    await expect(crearTipoTarea(tipo as never)).resolves.toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("mide la longitud del nombre del tipo en puntos de código", async () => {
    await expect(crearTipoTarea({
      id: "revision",
      nombre: "😀".repeat(40),
      color: "#299BC6",
      orden: 2,
    })).resolves.toEqual({ ok: true });
    await expect(crearTipoTarea({
      id: "revision",
      nombre: "😀".repeat(41),
      color: "#299BC6",
      orden: 2,
    })).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).toHaveBeenCalledOnce();
  });

  it.each([
    ["un id inválido", "Curso!", "Curso"],
    ["un nombre de 61 caracteres", "curso", "a".repeat(61)],
  ])("rechaza cursos con %s", async (_caso, id, nombre) => {
    await expect(crearCurso(id, nombre)).resolves.toMatchObject({ ok: false });
    expect(escribirSimulado).not.toHaveBeenCalled();
  });

  it("mide la longitud del nombre del curso en puntos de código", async () => {
    await expect(crearCurso("curso", "😀".repeat(60))).resolves.toEqual({ ok: true });
    await expect(crearCurso("curso", "😀".repeat(61))).resolves.toMatchObject({ ok: false });

    expect(escribirSimulado).toHaveBeenCalledOnce();
  });

  it("devuelve las opciones mínimas y no refresca tras leer", async () => {
    obtenerLeccionesSimulado.mockResolvedValueOnce([
      { numero: 4, titulo: "Estado", slug: "estado", curso: "react", estado: {} },
    ]);
    obtenerLeccionSimulado.mockResolvedValueOnce({
      numero: 4,
      titulo: "Estado",
      piezas: [
        { id: "leccion", titulo: "Lección", tipo: "leccion", video: null, portadas: [] },
      ],
    });

    await expect(opcionesLecciones("react")).resolves.toEqual([
      { numero: 4, titulo: "Estado" },
    ]);
    await expect(opcionesPiezas("react", 4)).resolves.toEqual([
      { id: "leccion", titulo: "Lección" },
    ]);
    expect(refreshSimulado).not.toHaveBeenCalled();
  });

  it("no consulta opciones con argumentos manipulados", async () => {
    await expect(opcionesLecciones("../react")).resolves.toEqual([]);
    await expect(opcionesPiezas("react", 0)).resolves.toEqual([]);
    expect(obtenerLeccionesSimulado).not.toHaveBeenCalled();
    expect(obtenerLeccionSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["host", { host: "sitio.ejemplo:3000", origin: "http://127.0.0.1:3000" }],
    ["origin", { host: "127.0.0.1:3000", origin: "http://sitio.ejemplo:3000" }],
  ])("no consulta lecciones con un %s ajeno", async (_caso, cabeceras) => {
    headersSimulados.mockResolvedValueOnce(new Headers(cabeceras));

    await expect(opcionesLecciones("react")).resolves.toEqual([]);
    expect(obtenerLeccionesSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["host", { host: "sitio.ejemplo:3000", origin: "http://127.0.0.1:3000" }],
    ["origin", { host: "127.0.0.1:3000", origin: "http://sitio.ejemplo:3000" }],
  ])("no consulta piezas con un %s ajeno", async (_caso, cabeceras) => {
    headersSimulados.mockResolvedValueOnce(new Headers(cabeceras));

    await expect(opcionesPiezas("react", 4)).resolves.toEqual([]);
    expect(obtenerLeccionSimulado).not.toHaveBeenCalled();
  });
});
