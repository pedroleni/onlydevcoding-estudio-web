import type { CSSProperties } from "react";

import { tecnologiaDe } from "@/lib/tecnologias";

const TAMANOS = {
  sm: "size-9 p-1.5 text-sm",
  md: "size-14 p-2.5 text-xl",
  lg: "size-20 p-3.5 text-3xl",
} as const;

// Logo de la tecnología de un curso dentro de una insignia teñida con su color.
// Sin tecnología conocida, la inicial del curso con el color de la marca.
export function LogoTecnologia({
  id,
  nombre,
  tamano = "md",
}: {
  id: string;
  nombre: string;
  tamano?: keyof typeof TAMANOS;
}) {
  const tecnologia = tecnologiaDe(id, nombre);
  const color = tecnologia?.color ?? "var(--marca)";
  const estilo = {
    "--tec": color,
    background: `color-mix(in srgb, ${color} 14%, transparent)`,
    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 35%, transparent)`,
  } as CSSProperties;

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-2xl ${TAMANOS[tamano]}`}
      style={estilo}
    >
      {tecnologia ? (
        <svg
          viewBox="0 0 24 24"
          role="img"
          aria-label={`Logo de ${tecnologia.nombre}`}
          className="size-full"
          fill={color}
        >
          <path d={tecnologia.trazado} />
        </svg>
      ) : (
        <span aria-hidden="true" className="font-semibold" style={{ color }}>
          {(nombre.trim()[0] ?? "?").toUpperCase()}
        </span>
      )}
    </span>
  );
}
