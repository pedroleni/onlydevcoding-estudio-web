import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

describe("manifiesto de la app", () => {
  it("abre en Cursos como ventana propia y sus iconos existen en public/", () => {
    const datos = manifest();

    expect(datos).toMatchObject({ start_url: "/cursos", display: "standalone" });
    expect(datos.icons?.map(({ sizes }) => sizes)).toEqual(["192x192", "512x512"]);
    for (const { src } of datos.icons ?? []) {
      expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
    }
  });
});
