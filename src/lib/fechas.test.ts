import { describe, expect, it } from "vitest";

import {
  diasDeSemana,
  esFechaValida,
  fechaLegible,
  fechaLocal,
  lunesDe,
  sumarDias,
} from "@/lib/fechas";

describe("utilidades de fechas de tareas", () => {
  it("calcula de lunes a domingo aunque la semana cruce el año", () => {
    expect(diasDeSemana("2026-01-01")).toEqual([
      "2025-12-29",
      "2025-12-30",
      "2025-12-31",
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(lunesDe("2026-01-01")).toBe("2025-12-29");
  });

  it("suma días en UTC al cruzar de mes", () => {
    expect(sumarDias("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("valida el calendario real y los años bisiestos", () => {
    expect(esFechaValida("2026-02-29")).toBe(false);
    expect(esFechaValida("2028-02-29")).toBe(true);
    expect(esFechaValida("2026-2-09")).toBe(false);
    expect(esFechaValida("0000-01-01")).toBe(false);
  });

  it("produce la fecha legible exacta en castellano", () => {
    expect(fechaLegible("2026-11-16")).toBe("lun 16 nov");
  });

  it("usa el día local, no UTC, en ambos extremos del día", () => {
    expect(fechaLocal(new Date(2026, 10, 16, 23, 59))).toBe("2026-11-16");
    expect(fechaLocal(new Date(2026, 10, 17, 0, 1))).toBe("2026-11-17");
  });
});
