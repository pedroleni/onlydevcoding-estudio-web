// Cada campo representa un solo texto: al pegar, los saltos se convierten en espacios.
const sinSaltos = (texto: string) => texto.replace(/[\r\n]+/g, " ");

export const limpio = (texto: string) => texto.replace(/\s+/g, " ").trim();

export const valido = (texto: string) => {
  const longitud = Array.from(limpio(texto)).length;
  return longitud >= 1 && longitud <= 1000;
};

// Copia de la lista con el texto de `indice` cambiado (sin saltos de línea).
export const cambiarTexto = (textos: string[], indice: number, valor: string) =>
  textos.map((texto, posicion) => (posicion === indice ? sinSaltos(valor) : texto));
