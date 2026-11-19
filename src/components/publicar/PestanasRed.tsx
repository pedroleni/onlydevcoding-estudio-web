"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { EstadoPublicacion } from "@/components/publicar/EstadoPublicacion";
import { PanelTextosRed } from "@/components/publicar/TextosRed";
import {
  AVISO_SIN_VIDEO_LINKEDIN,
  avisoRedesAusentes,
  esVideoLinkedin,
  faltaVideoPropio,
  nombreRed,
  redesDisponibles,
} from "@/lib/redes-publicacion";
import type { PiezaVista, RedVista } from "@/lib/tipos";

function IconoPublicacion({ estado }: { estado: RedVista["estado"]["estado"] }) {
  if (estado === "publicado") {
    return <span aria-label="subido" title="Subido">✅</span>;
  }
  if (estado === "programado") {
    return <span aria-label="programado" title="Programado">📅</span>;
  }
  return null;
}

export function PestanasRed({
  curso,
  numero,
  pieza,
  redInicial,
  soloVideoLinkedin,
}: {
  curso: string;
  numero: number;
  pieza: PiezaVista;
  redInicial: RedVista["red"];
  soloVideoLinkedin?: boolean;
}) {
  const prefijo = useId();
  const [redActivaId, setRedActivaId] = useState(redInicial);
  const todas = redesDisponibles(pieza);
  // true: solo la red LinkedIn de la lección; false: la lección sin LinkedIn; sin valor: todas.
  const redes =
    soloVideoLinkedin === undefined
      ? todas
      : todas.filter(({ red }) => esVideoLinkedin(pieza, red) === soloVideoLinkedin);
  const ausentes = soloVideoLinkedin ? null : avisoRedesAusentes(pieza);
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
            const href = `?pestana=publicar&pieza=${encodeURIComponent(pieza.id)}&red=${encodeURIComponent(redVista.red)}`;
            return (
              <Link
                key={redVista.red}
                id={idTab(redVista.red)}
                href={href}
                role="tab"
                aria-selected={seleccionada}
                aria-controls={idPanel(redVista.red)}
                aria-current={seleccionada ? "page" : undefined}
                onClick={(evento) => {
                  // Cambiar de red no pide la página al servidor: solo se cambia el panel y
                  // la URL. Navegar recargaba la lección y la devolvía arriba del todo.
                  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
                  evento.preventDefault();
                  setRedActivaId(redVista.red);
                  window.history.replaceState(null, "", href);
                }}
                className="inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-4 text-sm font-medium text-tenue transition-colors hover:text-texto aria-[selected=true]:border-marca aria-[selected=true]:text-texto"
              >
                <IconoPublicacion estado={redVista.estado.estado} />
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
            video={
              redActiva.textos?.video ?? (pieza.tipo === "leccion" ? null : pieza.video)
            }
            vertical={pieza.tipo !== "leccion" && !redActiva.textos?.video}
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
            avisoVideo={faltaVideoPropio(pieza, redActiva) ? AVISO_SIN_VIDEO_LINKEDIN : null}
          />
        </div>
      </div>
    </section>
  );
}
