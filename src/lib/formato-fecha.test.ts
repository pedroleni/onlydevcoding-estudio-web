import { describe, expect, it } from "vitest";

import { fechaHoraCorta } from "@/lib/formato-fecha";

describe("fechaHoraCorta", () => {
  it("formatea fecha y hora cortas en español", () => {
    const valor = "2026-11-18T10:04:00Z";
    const esperado = new Intl.DateTimeFormat("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(valor));

    expect(fechaHoraCorta(valor)).toBe(esperado);
    expect(fechaHoraCorta(valor)).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2},? \d{1,2}:\d{2}$/);
  });
});
