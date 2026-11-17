import { expect, it } from "vitest";

import type { EnlaceTarea, TareaVista } from "@/lib/tipos";

type ContratoTareaVista = TareaVista extends {
  hora: string | null;
  enlace: EnlaceTarea | null;
} ? true : false;

const tareaVistaTieneCamposObligatorios: ContratoTareaVista = true;

it("exige hora y enlace en una tarea recibida de la API", () => {
  expect(tareaVistaTieneCamposObligatorios).toBe(true);
});
