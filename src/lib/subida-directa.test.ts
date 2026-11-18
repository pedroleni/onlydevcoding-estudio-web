import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MENSAJE_TOKEN_AUSENTE } from "@/lib/api-escritura";
import {
  comprobarCuerpo,
  comprobarOrigen,
  reenviarSubida,
} from "@/lib/subida-directa";

const LIMITES = { maximoBytes: 100, maximoDigitos: 3, mensajeTamano: "Demasiado grande ficticio" };

function peticion(cabeceras: Record<string, string> = {}): Request {
  return new Request("http://127.0.0.1:3000/ruta-ficticia", {
    method: "PUT",
    headers: {
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
      "content-length": "4",
      ...cabeceras,
    },
    body: "abcd",
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

async function detalle(respuesta: Response | null) {
  return { status: respuesta?.status, cuerpo: await respuesta?.json() };
}

describe("subida directa (rutas que no pasan por el Proxy)", () => {
  beforeEach(() => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-solo-para-el-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("solo deja pasar el Host y el Origin exactos del estudio", async () => {
    expect(comprobarOrigen(peticion())).toBeNull();
    const ajenas: Array<Record<string, string>> = [
      { origin: "null" },
      { origin: "http://127.0.0.1:3000/" },
      { origin: "http://localhost:3000" },
      { host: "localhost:3000" },
    ];
    for (const cabeceras of ajenas) {
      await expect(detalle(comprobarOrigen(peticion(cabeceras)))).resolves.toEqual({
        status: 403,
        cuerpo: { detail: "Origen no permitido" },
      });
    }
    const dos = peticion();
    dos.headers.append("origin", "http://127.0.0.1:3000");
    expect(comprobarOrigen(dos)?.status).toBe(403);
  });

  it("devuelve el Content-Length válido y rechaza los que no lo son", async () => {
    expect(comprobarCuerpo(peticion(), LIMITES)).toEqual({ ok: true, contentLength: "4" });
    const casos: Array<[Record<string, string>, number, string]> = [
      [{ "content-length": "1e3" }, 411, "Content-Length es obligatorio"],
      [{ "content-length": "0001" }, 413, "Demasiado grande ficticio"],
      [{ "content-length": "0" }, 400, "Content-Length no es válido"],
      [{ "content-length": "101" }, 413, "Demasiado grande ficticio"],
      [{ "transfer-encoding": "chunked" }, 400, "Transfer-Encoding no está permitido"],
    ];
    for (const [cabeceras, status, mensaje] of casos) {
      const resultado = comprobarCuerpo(peticion(cabeceras), LIMITES);
      expect(resultado.ok).toBe(false);
      if (!resultado.ok) {
        await expect(detalle(resultado.respuesta)).resolves.toEqual({
          status,
          cuerpo: { detail: mensaje },
        });
      }
    }
    const sinLongitud = peticion();
    sinLongitud.headers.delete("content-length");
    const resultado = comprobarCuerpo(sinLongitud, LIMITES);
    expect(resultado.ok ? 0 : resultado.respuesta.status).toBe(411);
  });

  it("reenvía con el token del servidor y solo las cabeceras necesarias", async () => {
    const fetchSimulado = vi.fn().mockResolvedValue(
      new Response("{}", { status: 201, headers: { "content-type": "application/json" } }),
    );
    vi.stubGlobal("fetch", fetchSimulado);
    const request = peticion({ "x-estudio-token": "token-del-cliente" });

    const respuesta = await reenviarSubida(request, {
      url: "http://127.0.0.1:8000/destino-ficticio",
      tipo: "audio/wav",
      contentLength: "4",
    });

    expect(fetchSimulado).toHaveBeenCalledWith("http://127.0.0.1:8000/destino-ficticio", {
      method: "PUT",
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": "4",
        "X-Estudio-Token": "token-solo-para-el-test",
      },
      body: request.body,
      cache: "no-store",
      redirect: "error",
      duplex: "half",
    });
    expect(respuesta.status).toBe(201);
    expect(respuesta.headers.get("content-type")).toBe("application/json");
  });

  it("sin token da 503 y sin API da 502, sin llamar o sin filtrar nada", async () => {
    const fetchSimulado = vi.fn();
    vi.stubGlobal("fetch", fetchSimulado);
    vi.stubEnv("ESTUDIO_TOKEN", "");
    const opciones = { url: "http://127.0.0.1:8000/x", tipo: "audio/wav", contentLength: "4" };

    await expect(detalle(await reenviarSubida(peticion(), opciones))).resolves.toEqual({
      status: 503,
      cuerpo: { detail: MENSAJE_TOKEN_AUSENTE },
    });
    expect(fetchSimulado).not.toHaveBeenCalled();

    vi.stubEnv("ESTUDIO_TOKEN", "token-solo-para-el-test");
    fetchSimulado.mockRejectedValue(new TypeError("fetch failed"));
    await expect(detalle(await reenviarSubida(peticion(), opciones))).resolves.toEqual({
      status: 502,
      cuerpo: { detail: "No se puede conectar con la API" },
    });
  });
});
