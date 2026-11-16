import Link from "next/link";

export const PESTANAS = [
  { id: "guion", etiqueta: "Guion" },
  { id: "grabaciones", etiqueta: "Grabaciones" },
  { id: "video", etiqueta: "Vídeo final" },
  { id: "shorts", etiqueta: "Shorts y reels" },
  { id: "publicar", etiqueta: "Publicar" },
] as const;

export type PestanaLeccion = (typeof PESTANAS)[number]["id"];

export function esPestanaLeccion(valor: unknown): valor is PestanaLeccion {
  return PESTANAS.some(({ id }) => id === valor);
}

export function PestanasLeccion({
  curso,
  numero,
  activa,
}: {
  curso: string;
  numero: number;
  activa: PestanaLeccion;
}) {
  return (
    <nav aria-label="Etapas de la lección" className="overflow-x-auto">
      <div
        role="tablist"
        aria-label="Contenido de la lección"
        className="flex min-w-max border-b border-borde"
      >
        {PESTANAS.map(({ id, etiqueta }) => {
          const seleccionada = id === activa;

          return (
            <Link
              key={id}
              href={`/cursos/${encodeURIComponent(curso)}/${numero}?pestana=${id}`}
              role="tab"
              aria-selected={seleccionada}
              aria-current={seleccionada ? "page" : undefined}
              className="inline-flex min-h-12 items-center border-b-2 border-transparent px-4 text-sm font-medium text-tenue transition-colors hover:text-texto aria-[selected=true]:border-marca aria-[selected=true]:text-texto"
            >
              {etiqueta}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
