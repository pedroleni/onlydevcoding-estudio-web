"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const enlaces = [
  { href: "/cursos", etiqueta: "Cursos" },
  { href: "/teleprompter", etiqueta: "Teleprompter" },
  { href: "/tareas", etiqueta: "Tareas" },
  { href: "/trabajos", etiqueta: "Trabajos" },
] as const;

export function BarraNavegacion() {
  const pathname = usePathname();

  return (
    <header className="border-b border-borde bg-superficie">
      <div className="mx-auto flex min-h-16 w-[min(100%-2rem,80rem)] items-center gap-6 md:w-[min(100%-4rem,80rem)] md:gap-10">
        <Link
          href="/cursos"
          className="shrink-0 text-base font-semibold tracking-[-0.02em]"
          aria-label="OnlyDevCoding, ir a Cursos"
        >
          <span className="text-marca">Only</span>
          <span>DevCoding</span>
        </Link>

        <nav aria-label="Navegación principal" className="min-w-0 overflow-x-auto">
          <ul className="flex min-w-max items-center gap-1">
            {enlaces.map(({ href, etiqueta }) => {
              const activo = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={activo ? "page" : undefined}
                    className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-medium text-tenue transition-colors hover:text-texto aria-[current=page]:border-marca aria-[current=page]:text-texto"
                  >
                    {etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
