// Cada campo representa un solo texto: al pegar, los saltos se convierten en espacios.
export const sinSaltos = (texto: string) => texto.replace(/[\r\n]+/g, " ");

export const limpio = (texto: string) => texto.replace(/\s+/g, " ").trim();

export const valido = (texto: string) => {
  const longitud = Array.from(limpio(texto)).length;
  return longitud >= 1 && longitud <= 1000;
};
