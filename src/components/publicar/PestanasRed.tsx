"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { EstadoPublicacion } from "@/components/publicar/EstadoPublicacion";
import { PanelTextosRed } from "@/components/publicar/TextosRed";
import {
  avisoRedesAusentes,
  nombreRed,
  redesDisponibles,
} from "@/lib/redes-publicacion";
import type { PiezaVista, RedVista } from "@/lib/tipos";

export function PestanasRed({
  curso,
  numero,
  pieza,
  redInicial,
}: {
  curso: string;
  numero: number;
  pieza: PiezaVista;
  redInicial: RedVista["red"];
}) {
  const prefijo = useId();
  const [redActivaId, setRedActivaId] = useState(redInicial);
  const redes = redesDisponibles(pieza);
  const ausentes = avisoRedesAusentes(pieza.redes);
  const redActiva = redes.find(({ red }) => red === redActivaId) ?? redes[0];

  if (!redActiva) return null;

  const idTab = (red: RedVista["red"]) => `${prefijo}-tab-${red}`;
  const idPanel = (red: RedVista["red"]) => `${prefijo}-panel-${red}`;

  return (
    <section
      aria-labelledby={`${prefijo}-titulo`}
      className="min-w-0 max-w-full"
    >
      <h2 id={`${prefijo}-titulo`} className="text-xl font-semibold">
        Publicación por red
      </h2>
      <nav
        aria-label="Redes de publicación"
        className="mt-4 max-w-full overflow-x-auto"
      >
        <div role="tablist" className="flex min-w-max border-b border-borde">
          {redes.map((redVista) => {
            const seleccionada = redVista.red === redActiva.red;
            return (
              <Link
                key={redVista.red}
                id={idTab(redVista.red)}
                href={`?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}&red=${encodeURIComponent(redVista.red)}`}
                role="tab"
                aria-selected={seleccionada}
                aria-controls={idPanel(redVista.red)}
                aria-current={seleccionada ? "page" : undefined}
                onClick={() => setRedActivaId(redVista.red)}
                className="inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-tenue transition-colors hover:text-texto aria-[selected=true]:border-marca aria-[selected=true]:text-texto"
              >
                {nombreRed(redVista.red)}
                {redVista.textos ? (
                  <span
                    aria-hidden="true"
                    title="Con textos"
                    className="h-1.5 w-1.5 rounded-full bg-marca"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>
      </nav>
      {ausentes ? (
        <p className="mt-2 text-xs text-tenue">{ausentes}</p>
      ) : null}

      <div
        key={`${pieza.id}-${redActiva.red}`}
        id={idPanel(redActiva.red)}
        role="tabpanel"
        aria-labelledby={idTab(redActiva.red)}
        className="mt-5 grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]"
      >
        <div className="min-w-0">
          <PanelTextosRed
            curso={curso}
            numero={numero}
            pieza={pieza.id}
            red={redActiva.red}
            textos={redActiva.textos}
            fechaPropuesta={pieza.fecha_propuesta}
          />
        </div>
        <div className="min-w-0">
          <EstadoPublicacion
            curso={curso}
            numero={numero}
            pieza={pieza.id}
            red={redActiva.red}
            nombreRed={nombreRed(redActiva.red)}
            estado={redActiva.estado}
            fechaPropuesta={pieza.fecha_propuesta}
          />
        </div>
      </div>
    </section>
  );
}
