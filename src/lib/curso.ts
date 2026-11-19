import type { EstadoLeccion } from "@/lib/tipos";

export const CURSO_VALIDO = /^[a-z0-9-]{1,40}$/;

// Curso y número de lección que se pueden mandar a la API (las Server Actions reciben
// los argumentos del cliente sin tipos garantizados).
export function leccionValida(curso: unknown, numero: unknown): boolean {
  return (
    typeof curso === "string" &&
    CURSO_VALIDO.test(curso) &&
    typeof numero === "number" &&
    Number.isInteger(numero) &&
    numero >= 1 &&
    numero <= 999
  );
}

export const REDES = [
  ["youtube", "YouTube"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["linkedin", "LinkedIn"],
] as const;

function estaPublicado(
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

const GRUPOS = [
  ["leccion", "Lección"],
  ["cortos", "Reels y shorts"],
] as const;

export interface GrupoPublicacion {
  titulo: string | null;
  marcas: { icono: string; texto: string }[];
}

// Marcas de publicación separando la lección de los reels y shorts (en Instagram y
// TikTok solo van los cortos). Cada grupo enseña solo las redes en que se publica.
export function gruposPublicacion(estado: EstadoLeccion): GrupoPublicacion[] {
  const porGrupo = estado.publicado_por_grupo;
  if (!porGrupo) {
    return [
      {
        titulo: null,
        marcas: REDES.map(([clave, nombre]) => marcaPublicacion(estado, clave, nombre)),
      },
    ];
  }
  return GRUPOS.flatMap(([clave, titulo]) => {
    const avances = porGrupo[clave] ?? {};
    const marcas = REDES.flatMap(([red, nombre]) => {
      const avance = avances[red];
      if (!avance || avance.total === 0) return [];
      const icono =
        avance.hechas >= avance.total ? "✅" : avance.hechas > 0 ? "🟡" : "⬜";
      const texto = avance.total > 1 ? `${nombre} ${avance.hechas}/${avance.total}` : nombre;
      return [{ icono, texto }];
    });
    return marcas.length > 0 ? [{ titulo, marcas }] : [];
  });
}
