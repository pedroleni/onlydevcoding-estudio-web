"use client";

import { useState, useTransition } from "react";

import { cambiarEstado } from "@/lib/acciones";
import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";
import type { EstadoRed, RedVista } from "@/lib/tipos";
import { errorUrlPublicacion } from "@/lib/url-publicacion";

function valorDatetimeLocal(fecha: string | null): string {
  if (fecha === null) return "";
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return "";
  const dos = (numero: number) => String(numero).padStart(2, "0");
  return `${valor.getFullYear()}-${dos(valor.getMonth() + 1)}-${dos(valor.getDate())}T${dos(valor.getHours())}:${dos(valor.getMinutes())}`;
}

type ObjetivoAccion = "programar" | "publicar" | "pendiente";

export function EstadoPublicacion({
  curso,
  numero,
  pieza,
  red,
  nombreRed,
  estado,
  fechaPropuesta,
  avisoVideo = null,
}: {
  curso: string;
  numero: number;
  pieza: string;
  red: RedVista["red"];
  nombreRed: string;
  estado: EstadoRed;
  fechaPropuesta: string | null;
  // Aviso si la red necesita un vídeo propio que aún no está preparado.
  avisoVideo?: string | null;
}) {
  const fechaInicial =
    estado.estado === "programado" ? estado.fecha : fechaPropuesta;
  const [fecha, setFecha] = useState(valorDatetimeLocal(fechaInicial));
  const [url, setUrl] = useState(estado.url ?? "");
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<{
    objetivo: ObjetivoAccion;
    mensaje: string;
  } | null>(null);

  function ejecutar(objetivo: ObjetivoAccion, nuevoEstado: EstadoRed) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await cambiarEstado(
        curso,
        numero,
        pieza,
        red,
        nuevoEstado,
      );
      if (!resultado.ok) {
        setError({ objetivo, mensaje: resultado.mensaje });
        return;
      }
      const estadoGuardado = resultado.vista.piezas
        .find(({ id }) => id === pieza)
        ?.redes.find(({ red: id }) => id === red)?.estado ?? nuevoEstado;
      const fechaGuardada =
        estadoGuardado.estado === "programado"
          ? estadoGuardado.fecha
          : fechaPropuesta;
      setFecha(valorDatetimeLocal(fechaGuardada));
      setUrl(estadoGuardado.url ?? "");
    });
  }

  function programar() {
    if (fecha === "") {
      setError({
        objetivo: "programar",
        mensaje: "Elige una fecha y una hora para programar",
      });
      return;
    }
    ejecutar("programar", { estado: "programado", fecha, url: null });
  }

  function publicar() {
    const errorUrl = errorUrlPublicacion(url);
    if (errorUrl !== null) {
      setError({ objetivo: "publicar", mensaje: errorUrl });
      return;
    }
    ejecutar("publicar", {
      estado: "publicado",
      fecha: estado.estado === "publicado" ? estado.fecha : null,
      url: url === "" ? null : url,
    });
  }

  const etiquetaEstado =
    estado.estado === "publicado"
      ? "Publicado"
      : estado.estado === "programado"
        ? "Programado"
        : "Pendiente";

  return (
    <section
      aria-labelledby="estado-publicacion-titulo"
      className="border border-borde bg-superficie p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="estado-publicacion-titulo" className="text-xl font-semibold">
          Estado
        </h2>
        <span
          className={`border px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
            estado.estado === "publicado"
              ? "border-verde/50 bg-verde/15 text-verde"
              : estado.estado === "programado"
                ? "border-marca/50 bg-marca/15 text-azul-claro"
                : "border-borde bg-carbon text-tenue"
          }`}
        >
          {estado.estado === "publicado" ? "✅ " : estado.estado === "programado" ? "📅 " : ""}
          {etiquetaEstado}
        </span>
      </div>

      {estado.fecha ? (
        <p className="mt-3 text-sm text-tenue">
          {fechaPublicacionLegible(estado.fecha)}
        </p>
      ) : null}
      {estado.url ? (
        <p className="mt-1 break-all text-sm text-marca">{estado.url}</p>
      ) : null}
      {avisoVideo && estado.estado !== "publicado" ? (
        <p className="mt-3 border-l-2 border-ambar pl-3 text-sm text-ambar">
          {avisoVideo}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5">
        <div>
          <label
            htmlFor={`fecha-publicacion-${pieza}-${red}`}
            className="block text-sm font-medium"
          >
            Fecha y hora local
          </label>
          <input
            id={`fecha-publicacion-${pieza}-${red}`}
            type="datetime-local"
            step="60"
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
            className="mt-2 min-h-11 w-full border border-borde bg-carbon px-3 text-sm text-texto scheme-dark"
          />
          <button
            type="button"
            disabled={pendiente}
            onClick={programar}
            className="mt-2 min-h-11 w-full border border-marca px-4 text-sm font-semibold text-marca transition-colors hover:bg-marca hover:text-fondo disabled:cursor-wait disabled:opacity-60"
          >
            📅 Programar
          </button>
          {error?.objetivo === "programar" ? (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {error.mensaje}
            </p>
          ) : null}
        </div>

        <div className="border-t border-borde pt-5">
          <label
            htmlFor={`url-publicacion-${pieza}-${red}`}
            className="block text-sm font-medium"
          >
            URL de la publicación (opcional)
          </label>
          <input
            id={`url-publicacion-${pieza}-${red}`}
            type="url"
            inputMode="url"
            value={url}
            onChange={(evento) => setUrl(evento.target.value)}
            placeholder="Pega aquí la URL publicada"
            className="mt-2 min-h-11 w-full border border-borde bg-carbon px-3 text-sm text-texto placeholder:text-tenue"
          />
          <button
            type="button"
            disabled={pendiente}
            onClick={publicar}
            className="mt-2 min-h-11 w-full bg-marca px-4 text-sm font-bold text-fondo transition-colors hover:bg-texto disabled:cursor-wait disabled:opacity-60"
          >
            ✓ Marcar como publicado en {nombreRed}
          </button>
          {error?.objetivo === "publicar" ? (
            <p role="alert" className="mt-2 text-sm text-red-400">
              {error.mensaje}
            </p>
          ) : null}
        </div>

        {estado.estado !== "pendiente" ? (
          <div className="border-t border-borde pt-5">
            <button
              type="button"
              disabled={pendiente}
              onClick={() =>
                ejecutar("pendiente", {
                  estado: "pendiente",
                  fecha: null,
                  url: null,
                })
              }
              className="min-h-11 w-full border border-borde px-4 text-sm font-medium text-tenue transition-colors hover:border-texto hover:text-texto disabled:cursor-wait disabled:opacity-60"
            >
              Volver a pendiente
            </button>
            {error?.objetivo === "pendiente" ? (
              <p role="alert" className="mt-2 text-sm text-red-400">
                {error.mensaje}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
