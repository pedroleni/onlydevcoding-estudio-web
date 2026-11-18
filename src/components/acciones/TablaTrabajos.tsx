"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { cancelarTrabajo } from "@/lib/acciones-estudio";
import type { IdAccion, Trabajo } from "@/lib/tipos";

export const ETIQUETAS_ACCION: Record<IdAccion, string> = {
  "alinear-voz": "Alinear la voz",
  "preparar-montaje": "Preparar el montaje",
  "previa-grabacion": "Vista previa de grabación",
  "render-leccion": "Renderizar una versión nueva",
  "video-final": "Crear el vídeo final (−14 LUFS)",
  "preparar-shorts": "Preparar los shorts",
  "render-short": "Renderizar el short",
};

const FECHA = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
});

const ESTADOS: Record<Trabajo["estado"], string> = {
  en_marcha: "En marcha",
  hecho: "Hecho",
  error: "Error",
  interrumpido: "Interrumpido",
  cancelado: "Cancelado",
};

function fecha(valor: string | null): string {
  return valor ? FECHA.format(new Date(valor)) : "—";
}

function etiqueta(accion: string): string {
  return ETIQUETAS_ACCION[accion as IdAccion] ?? accion;
}

function haTerminado(trabajo: Trabajo): boolean {
  return trabajo.estado !== "en_marcha";
}

function FilaTrabajo({ inicial }: { inicial: Trabajo }) {
  const router = useRouter();
  const [base, setBase] = useState(inicial);
  const [inicialAnterior, setInicialAnterior] = useState(inicial);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const terminado = useRef<Trabajo | null>(haTerminado(inicial) ? inicial : null);
  const [pendiente, iniciar] = useTransition();

  if (inicial !== inicialAnterior) {
    setInicialAnterior(inicial);
    setBase(inicial);
  }

  useEffect(() => {
    terminado.current = haTerminado(inicial) ? inicial : null;
  }, [inicial]);

  const trabajo = useSeguimientoTrabajo({
    trabajo: base,
    alTerminar: (trabajoTerminado) => {
      terminado.current = trabajoTerminado;
      setBase(trabajoTerminado);
      setCancelandoId(null);
    },
  }) ?? base;

  function cancelar() {
    setMensaje(null);
    setCancelandoId(trabajo.id);
    iniciar(async () => {
      const resultado = await cancelarTrabajo(trabajo.id);
      if (terminado.current?.id === trabajo.id) return;

      if (resultado.ok) {
        setBase(resultado.trabajo);
        if (haTerminado(resultado.trabajo)) {
          terminado.current = resultado.trabajo;
          setCancelandoId(null);
          router.refresh();
        }
      } else {
        setCancelandoId(null);
        setMensaje(resultado.mensaje);
      }
    });
  }

  const cancelando =
    trabajo.estado === "en_marcha" && cancelandoId === trabajo.id;

  return (
    <tr className="border-t border-borde align-top">
      <th scope="row" className="px-4 py-4 text-left font-medium text-texto">
        {etiqueta(trabajo.accion)}
      </th>
      <td className="px-4 py-4">
        {trabajo.curso && trabajo.numero !== null ? (
          <Link
            href={`/cursos/${encodeURIComponent(trabajo.curso)}/${trabajo.numero}`}
            className="font-medium text-marca hover:text-texto"
          >
            {trabajo.curso} · {trabajo.numero}
          </Link>
        ) : (
          "—"
        )}
      </td>
      <td className="px-4 py-4 font-mono text-xs">{trabajo.objetivo ?? "—"}</td>
      <td className="px-4 py-4">
        {cancelando && trabajo.estado === "en_marcha"
          ? "Cancelando…"
          : ESTADOS[trabajo.estado]}
      </td>
      <td className="px-4 py-4 font-mono text-xs">
        {Math.round(trabajo.progreso * 100)} %
      </td>
      <td className="whitespace-nowrap px-4 py-4">{fecha(trabajo.inicio)}</td>
      <td className="whitespace-nowrap px-4 py-4">{fecha(trabajo.fin)}</td>
      <td className="px-4 py-4">
        {trabajo.estado === "en_marcha" ? (
          <button
            type="button"
            disabled={pendiente || cancelando}
            onClick={cancelar}
            className="cursor-pointer border border-rojo px-3 py-2 text-sm font-semibold text-rojo hover:enabled:bg-rojo hover:enabled:text-fondo disabled:cursor-default disabled:opacity-40"
          >
            Cancelar
          </button>
        ) : (
          "—"
        )}
        {mensaje ? <p role="alert" className="mt-2 text-xs text-ambar">{mensaje}</p> : null}
      </td>
    </tr>
  );
}

export function TablaTrabajos({ trabajos }: { trabajos: Trabajo[] }) {
  if (trabajos.length === 0) {
    return (
      <p className="mt-8 border border-borde bg-superficie p-6 text-tenue">
        Todavía no hay trabajos.
      </p>
    );
  }

  return (
    <div className="mt-8 overflow-x-auto border border-borde bg-superficie">
      <table className="w-full min-w-[72rem] border-collapse text-sm text-tenue">
        <thead className="text-left text-xs uppercase tracking-[0.08em] text-texto">
          <tr>
            <th scope="col" className="px-4 py-3">Acción</th>
            <th scope="col" className="px-4 py-3">Lección</th>
            <th scope="col" className="px-4 py-3">Objetivo</th>
            <th scope="col" className="px-4 py-3">Estado</th>
            <th scope="col" className="px-4 py-3">Progreso</th>
            <th scope="col" className="px-4 py-3">Inicio</th>
            <th scope="col" className="px-4 py-3">Fin</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          {trabajos.map((trabajo) => <FilaTrabajo key={trabajo.id} inicial={trabajo} />)}
        </tbody>
      </table>
    </div>
  );
}
