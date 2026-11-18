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

  it("valida con la misma lista", () => {
    for (const id of IDS_ACCION) expect(esIdAccion(id)).toBe(true);
    expect(esIdAccion("borrar-todo")).toBe(false);
    expect(esIdAccion("__proto__")).toBe(false);
    expect(esIdAccion(1)).toBe(false);
  });
});
