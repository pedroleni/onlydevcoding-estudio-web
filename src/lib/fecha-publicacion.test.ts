import { describe, expect, it } from "vitest";

import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";

describe("fechaPublicacionLegible", () => {
  it("muestra la fecha propuesta en castellano con la hora local indicada", () => {
    expect(
      fechaPublicacionLegible("2026-11-16T20:00:00+01:00", {
        timeZone: "Europe/Madrid",
      }),
    ).toBe("lun 16 nov · 20:00");
  });
});
