import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MENSAJE_TOKEN_AUSENTE } from "@/lib/api-escritura";
import { PUT } from "./route";

const URL = "http://127.0.0.1:3000/grabar/react/4/E01";

function peticion(cabeceras: Record<string, string> = {}): Request {
  return new Request(URL, {
    method: "PUT",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "content-type": "audio/wav",
      "content-length": "12",
      ...cabeceras,
    },
    body: "RIFFxxxxWAVE",
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

function contexto(cambios: Partial<{ curso: string; numero: string; escena: string }> = {}) {
  return {
    params: Promise.resolve({
      curso: "react",
      numero: "4",
      escena: "E01",
      ...cambios,
    }),
  };
}

describe("subida de tomas", () => {
  beforeEach(() => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-solo-para-el-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rechaza un origin ajeno con 403 sin llamar a la API", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ origin: "http://sitio.ejemplo:3000" }),
      contexto(),
    );

    expect(respuesta.status).toBe(403);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it.each([
    ["un host ajeno", { host: "estudio.ejemplo:3000" }],
    ["localhost", { host: "localhost:3000", origin: "http://localhost:3000" }],
  ])("rechaza %s con 403 sin redirigir ni llamar a la API", async (_caso, cabeceras) => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(cabeceras), contexto());

    expect(respuesta.status).toBe(403);
    expect(respuesta.headers.get("location")).toBeNull();
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("exige Content-Length", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion();
    request.headers.delete("content-length");

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(411);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza cuerpos mayores de 200 MiB", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "content-length": "209715201" }),
      contexto(),
    );

    expect(respuesta.status).toBe(413);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("trata cualquier Content-Length de 10 o más dígitos como demasiado grande", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "content-length": "0000000001" }),
      contexto(),
    );

    expect(respuesta.status).toBe(413);
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

  it("rechaza espacios en Content-Length con 411", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const base = peticion();
    const request = {
      body: base.body,
      headers: {
        get(nombre: string) {
          return nombre.toLowerCase() === "content-length"
            ? " 12 "
            : base.headers.get(nombre);
        },
        has(nombre: string) {
          return base.headers.has(nombre);
        },
      },
    } as Request;

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(411);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("da 411 para Transfer-Encoding chunked sin Content-Length", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion({ "transfer-encoding": "chunked" });
    request.headers.delete("content-length");

    const respuesta = await PUT(request, contexto());

    expect(respuesta.status).toBe(411);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("acepta audio/wav con parámetros y sin distinguir mayúsculas", async () => {
    const fetchSimulado = vi.fn()
      .mockResolvedValueOnce(Response.json({}, { status: 201 }))
      .mockResolvedValueOnce(Response.json({}, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);

    const conParametros = await PUT(
      peticion({ "content-type": "audio/wav; codecs=1" }),
      contexto(),
    );
    const conMayusculas = await PUT(
      peticion({ "content-type": "Audio/WAV" }),
      contexto(),
    );

    expect(conParametros.status).toBe(201);
    expect(conMayusculas.status).toBe(201);
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
    for (const [, opciones] of fetchSimulado.mock.calls) {
      expect(opciones.headers["Content-Type"]).toBe("audio/wav");
    }
  });

  it("rechaza audio/mpeg con 415 sin llamar a la API", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(
      peticion({ "content-type": "audio/mpeg" }),
      contexto(),
    );

    expect(respuesta.status).toBe(415);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("rechaza una escena que no cumple el patrón", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(), contexto({ escena: "E1" }));

    expect(respuesta.status).toBe(400);
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("reenvía una toma válida en streaming y devuelve el 201 de la API", async () => {
    const toma = {
      escena: "E01",
      ruta: "grabaciones/E01.wav",
      version: 7,
      bytes: 12,
    };
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json(toma, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion();

    const respuesta = await PUT(request, contexto());

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/react/lecciones/4/grabaciones/E01",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "audio/wav",
          "Content-Length": "12",
          "X-Estudio-Token": "token-solo-para-el-test",
        },
        body: request.body,
        duplex: "half",
        redirect: "error",
      }),
    );
    expect(respuesta.status).toBe(201);
    const textoRespuesta = await respuesta.clone().text();
    await expect(respuesta.json()).resolves.toEqual(toma);
    expect(textoRespuesta).not.toContain("token-solo-para-el-test");
  });

  it("copia el Content-Type y el estado de una respuesta de error de la API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("fallo controlado", {
      status: 500,
      headers: { "content-type": "text/plain; charset=utf-8" },
    })));

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(500);
    expect(respuesta.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    await expect(respuesta.text()).resolves.toBe("fallo controlado");
  });

  it.each([204, 304])("devuelve %i sin cuerpo", async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status,
      headers: { "content-type": "application/json" },
    })));

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(status);
    await expect(respuesta.text()).resolves.toBe("");
  });

  it("devuelve 503 con el mensaje común cuando falta ESTUDIO_TOKEN", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "");
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(503);
    await expect(respuesta.json()).resolves.toEqual({
      detail: MENSAJE_TOKEN_AUSENTE,
    });
    expect(fetchSimulado).not.toHaveBeenCalled();
  });

  it("devuelve 502 si la API no responde sin filtrar el token", async () => {
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
