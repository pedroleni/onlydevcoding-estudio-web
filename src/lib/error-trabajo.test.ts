import { describe, expect, it } from "vitest";

import { textoErrorTrabajo } from "@/lib/error-trabajo";

describe("textoErrorTrabajo", () => {
  it("devuelve el mensaje fijo de la API", () => {
    expect(textoErrorTrabajo("Remotion terminó con el código 1")).toBe(
      "Remotion terminó con el código 1",
    );
  });

  it.each([
    "No existe /ruta/ficticia/toma.wav",
    "Fallo en C:\\carpeta\\ficticia",
  ])("descarta un texto con aspecto de ruta: %s", (error) => {
    expect(textoErrorTrabajo(error)).toBeNull();
  });

  it.each([null, "", "   "])("devuelve null sin texto (%j)", (error) => {
    expect(textoErrorTrabajo(error)).toBeNull();
  });
});
