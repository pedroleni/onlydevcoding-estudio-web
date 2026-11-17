import { describe, expect, it } from "vitest";

import { calcularPlan, ESPERA, mmss } from "./ritmo";

describe("calcularPlan", () => {
  it("termina una frase corta con las esperas de punto y frase", () => {
    const plan = calcularPlan([{ texto: "Sol claro.", pausa: 0 }], 150);

    expect(plan.pasos).toHaveLength(2);
    expect(plan.total).toBeCloseTo(
      plan.pasos[1].hasta + ESPERA.punto + ESPERA.frase,
    );
  });

  it("añade un paso para una pausa explícita", () => {
    const plan = calcularPlan([{ texto: "Idea simple.", pausa: 2 }], 150);
    const pausa = plan.pasos.find((paso) => paso.pausa);

    expect(pausa).toEqual({
      c: 0,
      pausa: true,
      desde: expect.any(Number),
      hasta: expect.any(Number),
    });
    expect(pausa!.hasta - pausa!.desde).toBe(2);
  });

  it("dura más cuando baja el ritmo", () => {
    const cues = [{ texto: "Brisa suave sobre hojas.", pausa: 0 }];

    expect(calcularPlan(cues, 110).total).toBeGreaterThan(
      calcularPlan(cues, 200).total,
    );
  });
});

describe("mmss", () => {
  it("formatea minutos y segundos descartando decimales", () => {
    expect(mmss(125.9)).toBe("2:05");
  });
});
