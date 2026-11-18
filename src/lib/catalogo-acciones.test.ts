import { describe, expect, it } from "vitest";

import {
  esIdAccion,
  ETIQUETAS_ACCION,
  IDS_ACCION,
} from "@/lib/catalogo-acciones";

describe("catálogo de acciones", () => {
  it("tiene una etiqueta para cada acción y ninguna más", () => {
    expect(Object.keys(ETIQUETAS_ACCION)).toEqual([...IDS_ACCION]);
  });

  it("incluye las acciones de las tomas con las etiquetas de la API", () => {
    expect(ETIQUETAS_ACCION["identificar-tomas"]).toBe("Identificar las tomas");
    expect(ETIQUETAS_ACCION["color-ganchos"]).toBe("Ajustar el color de los ganchos");
    expect(ETIQUETAS_ACCION["mejorar-toma"]).toBe("Mejorar con IA");
  });

  it("valida con la misma lista", () => {
    for (const id of IDS_ACCION) expect(esIdAccion(id)).toBe(true);
    expect(esIdAccion("borrar-todo")).toBe(false);
    expect(esIdAccion("__proto__")).toBe(false);
    expect(esIdAccion(1)).toBe(false);
  });
});
