import { describe, expect, it } from "vitest";

import { codificarWav } from "./wav";

const textoAscii = (vista: DataView, inicio: number, largo: number) =>
  Array.from({ length: largo }, (_, i) =>
    String.fromCharCode(vista.getUint8(inicio + i)),
  ).join("");

describe("codificarWav", () => {
  it("mezcla dos canales y escribe un WAV PCM mono de 16 bits", () => {
    const wav = codificarWav(
      [new Float32Array([1.5, -1, 0.5]), new Float32Array([1.5, 1, -0.5])],
      48_000,
    );
    const vista = new DataView(wav);

    expect(wav.byteLength).toBe(44 + 6);
    expect(textoAscii(vista, 0, 4)).toBe("RIFF");
    expect(textoAscii(vista, 8, 4)).toBe("WAVE");
    expect(vista.getUint16(22, true)).toBe(1);
    expect(vista.getUint32(24, true)).toBe(48_000);
    expect(vista.getUint16(34, true)).toBe(16);
    expect(vista.getInt16(44, true)).toBe(32_767);
    expect(vista.getInt16(46, true)).toBe(0);
    expect(vista.getInt16(48, true)).toBe(0);
  });
});
