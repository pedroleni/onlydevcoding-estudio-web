import Link from "next/link";

import { redVideoLinkedin, TITULO_VIDEO_LINKEDIN } from "@/lib/redes-publicacion";
import type { EstadoRed, PiezaVista } from "@/lib/tipos";

const ESTADO: Record<EstadoRed["estado"], string> = {
  publicado: "✅ Subido",
  programado: "📅 Programado",
  pendiente: "⬜ Pendiente",
};

const CLASE_TARJETA =
  "group min-w-44 border border-borde bg-superficie px-4 py-3 transition-colors hover:border-marca aria-[current=page]:border-marca aria-[current=page]:bg-carbon";

export function SelectorPieza({
  piezas,
  activa,
  red = null,
}: {
  piezas: PiezaVista[];
  activa: string;
  // Red elegida: con la lección, «linkedin» es la tarjeta del vídeo para LinkedIn.
  red?: string | null;
}) {
  return (
    <nav aria-label="Piezas de publicación" className="overflow-x-auto">
      <div className="flex min-w-max gap-2">
        {piezas.flatMap((pieza) => {
          const linkedin = redVideoLinkedin(pieza);
          const enLinkedin = pieza.id === activa && linkedin !== null && red === "linkedin";
          const tarjeta = (
            <Link
              key={pieza.id}
              href={`?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}`}
              aria-current={pieza.id === activa && !enLinkedin ? "page" : undefined}
              className={CLASE_TARJETA}
            >
              <span className="block text-sm font-semibold text-texto">{pieza.titulo}</span>
              <span className="mt-1 block font-mono text-xs text-tenue">
                {pieza.duracion ?? "Duración pendiente"}
              </span>
            </Link>
          );
          if (!linkedin) return [tarjeta];
          return [
            tarjeta,
            <Link
              key={`${pieza.id}-linkedin`}
              href={`?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}&red=linkedin`}
              aria-current={enLinkedin ? "page" : undefined}
              className={CLASE_TARJETA}
            >
              <span className="block text-sm font-semibold text-texto">
                {TITULO_VIDEO_LINKEDIN}
              </span>
              <span className="mt-1 block text-xs text-tenue">
                {ESTADO[linkedin.estado.estado]}
              </span>
            </Link>,
          ];
        })}
      </div>
    </nav>
  );
}
