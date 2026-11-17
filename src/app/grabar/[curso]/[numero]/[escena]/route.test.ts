import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("devuelve 502 si la API no responde sin filtrar el token", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const respuesta = await PUT(peticion(), contexto());

    expect(respuesta.status).toBe(502);
    await expect(respuesta.json()).resolves.toEqual({
      detail: "No se puede conectar con la API",
    });
  });
});
