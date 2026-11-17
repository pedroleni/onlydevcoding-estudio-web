import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { escribir } from "@/lib/api-escritura";

describe("cliente de escritura de la API local", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("conserva PUT como método predeterminado", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-de-test");
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetchSimulado);

    await escribir("/api/recurso", { valor: 1 });

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/recurso",
      expect.objectContaining({
        method: "PUT",
        body: '{"valor":1}',
        redirect: "error",
      }),
    );
  });

  it("envía el token y bloquea redirecciones en POST", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-de-test");
    const fetchSimulado = vi.fn().mockResolvedValue(Response.json({}, { status: 201 }));
    vi.stubGlobal("fetch", fetchSimulado);

    await escribir("/api/recurso", { valor: 1 }, "POST");

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/recurso",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-Estudio-Token": "token-de-test" }),
        redirect: "error",
      }),
    );
  });

  it("envía un objeto vacío en DELETE para conservar Content-Length", async () => {
    vi.stubEnv("ESTUDIO_TOKEN", "token-de-test");
    const fetchSimulado = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSimulado);

    await escribir("/api/recurso/3", { ignorado: true }, "DELETE");

    expect(fetchSimulado).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/recurso/3",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "X-Estudio-Token": "token-de-test" }),
        body: "{}",
        redirect: "error",
      }),
    );
  });
});
