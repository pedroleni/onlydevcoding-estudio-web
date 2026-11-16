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
