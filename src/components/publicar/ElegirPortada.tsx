"use client";

import { useState, useTransition } from "react";

import { elegirPortada } from "@/lib/acciones";
import { urlMedio } from "@/lib/medios";
import type { PiezaVista } from "@/lib/tipos";

export function ElegirPortada({
  curso,
  numero,
  pieza,
}: {
  curso: string;
  numero: number;
  pieza: PiezaVista;
}) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const vertical = pieza.tipo !== "leccion";

  function elegir(ruta: string) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await elegirPortada(curso, numero, pieza.id, ruta);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <section aria-labelledby="portadas-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="portadas-titulo" className="text-xl font-semibold">
          Portada — haz clic en la buena
        </h2>
        <span className="text-xs text-tenue">{pieza.portadas.length} opciones</span>
      </div>

      {pieza.portadas.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pieza.portadas.map((portada, indice) => {
            const elegida = portada === pieza.portada_elegida;
            return (
              <button
                key={portada}
                type="button"
                aria-label={`Portada ${indice + 1} de ${pieza.titulo}`}
                aria-pressed={elegida}
                disabled={pendiente}
                onClick={() => elegir(portada)}
                className="relative overflow-hidden border border-borde bg-carbon p-1 transition-colors hover:border-marca disabled:cursor-wait disabled:opacity-60 aria-pressed:border-marca"
              >
                {/* Las portadas proceden de la API local y no tienen dimensiones fijas. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={urlMedio(portada)}
                  alt=""
                  className={`${vertical ? "aspect-[9/16]" : "aspect-video"} w-full object-contain`}
                  loading="lazy"
                />
                {elegida ? (
                  <span className="absolute bottom-2 left-2 bg-marca px-2 py-1 text-xs font-bold text-fondo">
                    ✓ Elegida
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 border border-borde bg-superficie p-5 text-sm text-tenue">
          Esta pieza todavía no tiene portadas.
        </p>
      )}

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
