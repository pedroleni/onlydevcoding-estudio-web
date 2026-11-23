import { describe, expect, it } from "vitest";

import { esMicroDelPortatil, separarMicros } from "@/lib/teleprompter/microfonos";

describe("esMicroDelPortatil", () => {
  it.each([
    "Predeterminado - Micrófono del MacBook Pro",
    "Default - MacBook Pro Microphone",
    "Built-in Microphone",
    "Micrófono integrado",
    "Micrófono interno",
  ])("reconoce %s", (nombre) => {
    expect(esMicroDelPortatil(nombre)).toBe(true);
  });

  it.each(["Wireless microphone", ""])("descarta %s", (nombre) => {
    expect(esMicroDelPortatil(nombre)).toBe(false);
  });
});

describe("separarMicros", () => {
  it("separa el predeterminado y oculta entradas sin id", () => {
    const dispositivos = [
      { kind: "audioinput", deviceId: "", label: "" },
      { kind: "audioinput", deviceId: "default", label: "Default - MacBook Pro Microphone" },
      { kind: "audioinput", deviceId: "inalambrico", label: "Wireless microphone" },
      { kind: "videoinput", deviceId: "camara", label: "Cámara" },
    ] as MediaDeviceInfo[];

    expect(separarMicros(dispositivos)).toEqual({
      micros: [{ id: "inalambrico", nombre: "Wireless microphone" }],
      nombrePredeterminado: "Default - MacBook Pro Microphone",
    });
  });
});
