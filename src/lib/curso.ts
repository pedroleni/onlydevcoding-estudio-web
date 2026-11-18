import type { EstadoLeccion } from "@/lib/tipos";

export const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;

export const REDES = [
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
] as const;

export function estaPublicado(
  estado: EstadoLeccion,
  clave: string,
  nombre: string,
): boolean {
  return estado.publicado[clave] ?? estado.publicado[nombre] ?? false;
}

// Marca de una red en las tarjetas: ✅ si está todo publicado, 🟡 si falta algo de lo
// previsto, ⬜ si no hay nada. Con varias piezas previstas, añade el recuento.
export function marcaPublicacion(
  estado: EstadoLeccion,
  clave: string,
  nombre: string,
): { icono: string; texto: string } {
  const avance = estado.publicado_avance?.[clave];
  const completo = estaPublicado(estado, clave, nombre);
  if (!avance || avance.total === 0) {
    return { icono: completo ? "✅" : "⬜", texto: nombre };
  }
  const icono = completo ? "✅" : avance.hechas > 0 ? "🟡" : "⬜";
  const texto = avance.total > 1 ? `${nombre} ${avance.hechas}/${avance.total}` : nombre;
  return { icono, texto };
}
