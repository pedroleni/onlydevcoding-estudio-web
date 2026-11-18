import { describe, expect, it } from "vitest";

import { ApiNoDisponible, ErrorApi } from "@/lib/api";
import { lecturaApiOpcional } from "@/lib/lectura-opcional";

describe("lecturaApiOpcional", () => {
  it("devuelve lo leído", async () => {
    await expect(lecturaApiOpcional(Promise.resolve([1, 2]))).resolves.toEqual([1, 2]);
  });

  it("devuelve null si la API no responde o rechaza la petición", async () => {
    await expect(lecturaApiOpcional(Promise.reject(new ApiNoDisponible()))).resolves.toBeNull();
    await expect(lecturaApiOpcional(Promise.reject(new ErrorApi(500)))).resolves.toBeNull();
  });

  it("deja pasar cualquier otro error", async () => {
    const fallo = new TypeError("fallo de programación ficticio");
    await expect(lecturaApiOpcional(Promise.reject(fallo))).rejects.toBe(fallo);
  });
});
