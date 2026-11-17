import Link from "next/link";

import type { PiezaVista } from "@/lib/tipos";

export function SelectorPieza({
  piezas,
  activa,
}: {
  piezas: PiezaVista[];
  activa: string;
}) {
  return (
    <nav aria-label="Piezas de publicación" className="overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {piezas.map((pieza) => {
          const seleccionada = pieza.id === activa;
          return (
            <Link
              key={pieza.id}
              href={`?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}`}
              aria-current={seleccionada ? "page" : undefined}
              className="group min-w-44 border border-borde bg-superficie px-4 py-3 transition-colors hover:border-marca aria-[current=page]:border-marca aria-[current=page]:bg-carbon"
            >
              <span className="block text-sm font-semibold text-texto">
                {pieza.titulo}
              </span>
              <span className="mt-1 block font-mono text-xs text-tenue">
                {pieza.duracion ?? "Duración pendiente"}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
