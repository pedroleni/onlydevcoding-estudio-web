import { describe, expect, it } from "vitest";

import { calcularPlan, ESPERA, mmss } from "./ritmo";

describe("calcularPlan", () => {
  it("calcula a mano los tramos y las esperas de coma, punto y frase", () => {
    const plan = calcularPlan([{ texto: "Sol, mar.", pausa: 0 }], 150);

    expect(plan.pasos).toHaveLength(2);
    expect(plan.pasos[0]).toMatchObject({ c: 0, p: 0 });
    expect(plan.pasos[0].desde).toBeCloseTo(0);
    expect(plan.pasos[0].hasta).toBeCloseTo(0.32);
    expect(plan.pasos[1]).toMatchObject({ c: 0, p: 1 });
    expect(plan.pasos[1].desde).toBeCloseTo(0.32 + ESPERA.coma);
    expect(plan.pasos[1].hasta).toBeCloseTo(0.86);
    expect(plan.total).toBeCloseTo(0.86 + ESPERA.punto + ESPERA.frase);
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

  it("ignora una pausa explícita menor que un segundo", () => {
    const sinPausa = calcularPlan([{ texto: "Sol.", pausa: 0 }], 150);
    const pausaCorta = calcularPlan([{ texto: "Sol.", pausa: 0.99 }], 150);

    expect(pausaCorta).toEqual(sinPausa);
    expect(pausaCorta.pasos.some((paso) => paso.pausa)).toBe(false);
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
