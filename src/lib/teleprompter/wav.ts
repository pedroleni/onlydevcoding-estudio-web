export function codificarWav(
  canales: Float32Array[],
  frecuencia: number,
): ArrayBuffer {
  const muestras = canales[0].length;
  const buffer = new ArrayBuffer(44 + muestras * 2);
  const vista = new DataView(buffer);
  const escribirTexto = (inicio: number, texto: string) => {
    [...texto].forEach((caracter, i) =>
      vista.setUint8(inicio + i, caracter.charCodeAt(0)),
    );
  };

  escribirTexto(0, "RIFF");
  vista.setUint32(4, 36 + muestras * 2, true);
  escribirTexto(8, "WAVE");
  escribirTexto(12, "fmt ");
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true);
  vista.setUint16(22, 1, true);
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, frecuencia * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  escribirTexto(36, "data");
  vista.setUint32(40, muestras * 2, true);

  for (let i = 0; i < muestras; i++) {
    let muestra = 0;
    for (const canal of canales) muestra += canal[i];
    muestra = Math.max(-1, Math.min(1, muestra / canales.length));
    vista.setInt16(
      44 + i * 2,
      muestra < 0 ? muestra * 0x8000 : muestra * 0x7fff,
      true,
    );
  }

  return buffer;
}
