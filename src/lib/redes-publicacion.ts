import { REDES } from "@/lib/curso";
import type { RedVista } from "@/lib/tipos";

export function nombreRed(id: string): string {
  return REDES.find(([red]) => red === id)?.[1] ?? id;
}

// Una red cuenta para la pieza si tiene textos o si ya se programó o publicó en ella.
export function tieneContenido(red: RedVista): boolean {
  return red.textos !== null || red.estado.estado !== "pendiente";
}

export function redesDisponibles(redes: RedVista[]): RedVista[] {
  return redes.filter(tieneContenido);
}

export function avisoRedesAusentes(redes: RedVista[]): string | null {
  const nombres = redes
    .filter((red) => !tieneContenido(red))
    .map(({ red }) => nombreRed(red));
  if (nombres.length === 0) return null;
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} ni ${nombres.at(-1)}`;
  return `Esta pieza no se publica en ${lista}`;
}
