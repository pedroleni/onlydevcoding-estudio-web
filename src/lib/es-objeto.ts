// Guarda común de las Server Actions, que reciben `unknown` del navegador. Vive fuera de los
// módulos "use server" porque estos solo pueden exportar funciones asíncronas.
export function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}
