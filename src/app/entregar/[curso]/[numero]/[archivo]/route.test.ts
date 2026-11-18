import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MENSAJE_TOKEN_AUSENTE } from "@/lib/api-escritura";
import { PUT } from "./route";

const URL = "http://127.0.0.1:3000/entregar/react/4/Toma%20ficticia%201.MOV";
const CUERPO = "\0\0\0\x18ftypqt  ";

function peticion(cabeceras: Record<string, string> = {}): Request {
  return new Request(URL, {
    method: "PUT",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "content-type": "video/quicktime",
      "content-length": String(CUERPO.length),
      ...cabeceras,
    },
    body: CUERPO,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function contexto(cambios: Partial<{ curso: string; numero: string; archivo: string }> = {}) {
  return {
    params: Promise.resolve({
      curso: "react",
      numero: "4",
      archivo: "Toma ficticia 1.MOV",
      ...cambios,
    }),
  };
}

describe("entrega de tomas de cámara", () => {
  beforeEach(() => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-solo-para-el-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rechaza una petición sin Origin con 403 sin llamar a la API", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion();
    request.headers.delete("origin");

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(403);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["un origin ajeno", { origin: "http://sitio.ejemplo:3000" }],
    ["un host ajeno", { host: "estudio.ejemplo:3000" }],
    ["localhost", { host: "localhost:3000", origin: "http://localhost:3000" }],
  ])("rechaza %s con 403", async (_caso, cabeceras) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(cabeceras), contexto());

    expect(respuesta.status).toBe(403);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["un nombre con ruta", { archivo: "../x.mov" }],
    ["un nombre con barra invertida", { archivo: "..\\x.mov" }],
    ["un curso no válido", { curso: "React!" }],
    ["un número no válido", { numero: "04" }],
  ])("rechaza %s con 400", async (_caso, cambios) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(), contexto(cambios));

    expect(respuesta.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each(["Toma ñ.mov", ".oculta.mov", "toma.avi", "toma"])(
    "rechaza el nombre %j con el mensaje de la API",
    async (archivo) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      const respuesta = await PUT(peticion(), contexto({ archivo }));

      expect(respuesta.status).toBe(422);
      await expect(respuesta.json()).resolves.toEqual({
        detail:
          "Ese nombre de archivo no se admite: renómbralo con letras sin acentos, números, espacios, guiones o puntos",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it("exige Content-Length", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion();
    request.headers.delete("content-length");

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(411);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each(["+5", "1e3", "", "12, 12"])(
    "rechaza el Content-Length manipulado %j con 411",
    async (contentLength) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      const respuesta = await PUT(
        peticion({ "content-length": contentLength }),
        contexto(),
      );

      expect(respuesta.status).toBe(411);
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it.each(["00000000001", "99999999999"])(
    "trata el Content-Length de 11 dígitos %s como demasiado grande",
    async (contentLength) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);

      const respuesta = await PUT(
        peticion({ "content-length": contentLength }),
        contexto(),
      );

      expect(respuesta.status).toBe(413);
      await expect(respuesta.json()).resolves.toEqual({
        detail: "La toma supera el límite de 4 GiB",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it("rechaza un cuerpo de más de 4 GiB con 413", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "content-length": "4294967297" }),
      contexto(),
    );

    expect(respuesta.status).toBe(413);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza un Content-Length cero con 400", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion({ "content-length": "0" }), contexto());

    expect(respuesta.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza Transfer-Encoding con 400", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "transfer-encoding": "chunked" }),
      contexto(),
    );

    expect(respuesta.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each(["text/plain", "video/x-msvideo", ""])(
    "rechaza el tipo %j con 415",
    async (tipo) => {
      const fetchSimulado = vi.fn();
      vi.stubGlobal("fetch", fetchSimulado);
      const request = peticion({ "content-type": tipo });
      if (!tipo) request.headers.delete("content-type");

      const respuesta = await PUT(request, contexto());

      expect(respuesta.status).toBe(415);
      await expect(respuesta.json()).resolves.toEqual({
        detail: "La toma tiene que ser un vídeo MOV o MP4",
      });
      expect(fetchSimulado).not.toHaveBeenCalled();
    },
  );

  it("reenvía una toma válida con el token, el nombre codificado y en streaming", async () => {
    const entrega = { archivo: "Toma ficticia 1.MOV", bytes: CUERPO.length };
    const fetchSimulado = vi
      .fn()
      .mockResolvedValue(Response.json(entrega, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion({ "content-type": "Video/QuickTime; x=1" });

    const respuesta = await PUT(request, contexto());

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/react/lecciones/4/entregas/Toma%20ficticia%201.MOV",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "video/quicktime",
          "Content-Length": String(CUERPO.length),
          "X-Estudio-Token": "token-solo-para-el-test",
        },
        body: request.body,
        duplex: "half",
        redirect: "error",
      }),
    );
    expect(respuesta.status).toBe(201);
    const texto = await respuesta.clone().text();
    await expect(respuesta.json()).resolves.toEqual(entrega);
    expect(texto).not.toContain("token-solo-para-el-test");
  });

  it("acepta un MP4 de exactamente 4 GiB", async () => {
    const fetchSimulado = vi
      .fn()
      .mockResolvedValue(Response.json({ archivo: "toma.mp4", bytes: 1 }, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "content-type": "video/mp4", "content-length": "4294967296" }),
      contexto({ archivo: "toma.mp4" }),
    );

    expect(respuesta.status).toBe(201);
    expect(fetchSimulado.mock.calls[0][1].headers).toMatchObject({
      "Content-Type": "video/mp4",
      "Content-Length": "4294967296",
    });
  });

  it("conserva el estado y el detail de un error de la API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({ detail: "Ya hay una toma con ese nombre" }, { status: 409 }),
      ),
    );

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(409);
    expect(respuesta.headers.get("content-type")).toContain("application/json");
    await expect(respuesta.json()).resolves.toEqual({
      detail: "Ya hay una toma con ese nombre",
    });
  });

  it("devuelve 503 con el mensaje común cuando falta ESTUDIO_TOKEN", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "");
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(503);
    await expect(respuesta.json()).resolves.toEqual({ detail: MENSAJE_TOKEN_AUSENTE });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("devuelve 502 si la API no responde", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(502);
    await expect(respuesta.json()).resolves.toEqual({
      detail: "No se puede conectar con la API",
    });
  });

  it.each([
    ["Origin: null", (request: Request) => request.headers.set("origin", "null")],
    [
      "dos cabeceras Origin",
      (request: Request) => request.headers.append("origin", "http://127.0.0.1:3000"),
    ],
    [
      "un origen con barra final",
      (request: Request) => request.headers.set("origin", "http://127.0.0.1:3000/"),
    ],
  ])("rechaza %s con 403 sin llamar a la API", async (_caso, cambiar) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion();
    cambiar(request);

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(403);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("no reenvía el X-Estudio-Token que mande el cliente: solo el del servidor", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json({}, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "x-estudio-token": "token-del-cliente", cookie: "sesion=ficticia" }),
      contexto(),
    );

    expect(respuesta.status).toBe(201);
    const [, opciones] = fetchSimulado.mock.calls[0] as [string, RequestInit];
    const enviadas = new Headers(opciones.headers);
    expect(enviadas.get("x-estudio-token")).toBe("token-solo-para-el-test");
    expect([...enviadas.keys()].sort()).toEqual([
      "content-length",
      "content-type",
      "x-estudio-token",
    ]);
    expect(JSON.stringify(opciones.headers)).not.toContain("token-del-cliente");
  });
});
