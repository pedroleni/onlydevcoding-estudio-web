import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { headersSimulados } = vi.hoisted(() => ({ headersSimulados: vi.fn() }));

vi.mock("next/headers", () => ({ headers: headersSimulados }));

import { origenPermitido } from "@/lib/origen-servidor";

describe("origenPermitido", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("acepta el host y el origen exactos del estudio", async () => {
    headersSimulados.mockResolvedValue(new Headers({
      host: "127.0.0.1:3000",
      origin: "http://127.0.0.1:3000",
    }));

    await expect(origenPermitido()).resolves.toBe(true);
  });

  it.each([
    [{ host: "127.0.0.1:3000" }],
    [{ host: "127.0.0.1:3000", origin: "null" }],
    [{ host: "localhost:3000", origin: "http://localhost:3000" }],
    [{ host: "sitio.ejemplo:3000", origin: "http://sitio.ejemplo:3000" }],
    [{ host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000/" }],
    [{ origin: "http://127.0.0.1:3000" }],
  ])("rechaza %j", async (cabeceras) => {
    headersSimulados.mockResolvedValue(new Headers(cabeceras));

    await expect(origenPermitido()).resolves.toBe(false);
  });
});
