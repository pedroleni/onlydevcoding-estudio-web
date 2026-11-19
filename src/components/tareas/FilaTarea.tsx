"use client";

import Link from "next/link";
import { useId, useOptimistic, useState, useTransition, type ReactNode } from "react";

import { borrarTarea, editarTarea, marcarHecha } from "@/lib/acciones-tareas";
import { fechaLegible } from "@/lib/fechas";
import type { TareaVista } from "@/lib/tipos";
import { etiquetaEnlace, hrefEnlace } from "@/lib/vista-tareas";

export function FilaTarea({
  tarea,
  color,
  mostrarFecha = false,
  ponerDia = false,
  editar,
}: {
  tarea: TareaVista;
  color: string;
  mostrarFecha?: boolean;
  // En la lista total: un selector para asignarle día sin abrir el formulario.
  ponerDia?: boolean;
  editar?: ReactNode;
}) {
  const id = useId();
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // La casilla cambia al instante; si la acción falla, vuelve sola al valor del servidor.
  const [hecha, setHechaOptimista] = useOptimistic(tarea.hecha);

  const href = hrefEnlace(tarea);
  const etiqueta = etiquetaEnlace(tarea);
  const roto = tarea.enlace_vista?.roto === true;

  function cambiarHecha(nueva: boolean) {
    setError(null);
    iniciar(async () => {
      setHechaOptimista(nueva);
      const resultado = await marcarHecha(tarea.id, nueva);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  function asignarDia(fecha: string) {
    if (!fecha) return;
    setError(null);
    iniciar(async () => {
      const resultado = await editarTarea(tarea.id, {
        fecha,
        hora: tarea.hora,
        texto: tarea.texto,
        tipo: tarea.tipo,
        enlace: tarea.enlace,
      });
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  function borrar() {
    if (!window.confirm(`¿Borrar la tarea «${tarea.texto}»?`)) return;
    setError(null);
    iniciar(async () => {
      const resultado = await borrarTarea(tarea.id);
      if (!resultado.ok) setError(resultado.mensaje);
    });
  }

  return (
    <li
      className="flex flex-wrap items-start gap-x-3 gap-y-2 border-l-2 bg-superficie px-4 py-3"
      style={{ borderLeftColor: color }}
      aria-busy={pendiente}
    >
      <input
        id={id}
        type="checkbox"
        checked={hecha}
        disabled={pendiente}
        onChange={(evento) => cambiarHecha(evento.target.checked)}
        className="mt-1 size-4 shrink-0 accent-marca focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca"
      />
      <div className="min-w-0 flex-1">
        <label
          htmlFor={id}
          className={`break-words ${hecha ? "text-tenue line-through" : "text-texto"}`}
        >
          {tarea.texto}
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tenue">
          {mostrarFecha && tarea.fecha ? <span>{fechaLegible(tarea.fecha)}</span> : null}
          {tarea.hora ? <span className="font-mono">{tarea.hora}</span> : null}
          {href ? (
            <Link
              href={href}
              className="max-w-full truncate border border-borde px-2 py-0.5 text-marca hover:text-texto focus-visible:outline-2 focus-visible:outline-marca"
            >
              {etiqueta}
            </Link>
          ) : null}
          {roto ? (
            <span className="border border-[#E5534B]/60 px-2 py-0.5 text-[#E5534B]">
              Enlace roto
            </span>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-[#E5534B]">
            {error}
          </p>
        ) : null}
      </div>
      {/* En móvil los botones bajan a su propia línea para no estrujar el texto. */}
      <div className="flex w-full flex-wrap items-center gap-2 pl-7 sm:w-auto sm:shrink-0 sm:pl-0">
        {ponerDia && !hecha ? (
          <label className="flex items-center gap-1 text-xs text-tenue">
            <span className="sr-only">Poner día a «{tarea.texto}»</span>
            <input
              type="date"
              disabled={pendiente}
              defaultValue=""
              onChange={(evento) => asignarDia(evento.target.value)}
              className="min-h-9 border border-borde bg-fondo px-2 text-xs text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-50"
            />
          </label>
        ) : null}
        {editar}
        <button
          type="button"
          onClick={borrar}
          disabled={pendiente}
          aria-label={`Borrar «${tarea.texto}»`}
          className="min-h-9 border border-borde px-3 text-xs text-tenue hover:text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </li>
  );
}
