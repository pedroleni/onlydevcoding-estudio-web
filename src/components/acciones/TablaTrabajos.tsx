"use client";

import Link from "next/link";
import { useState } from "react";

import { BOTON_CANCELAR } from "@/components/acciones/BotonAccion";
import { useCancelacionTrabajo } from "@/components/acciones/useCancelacionTrabajo";
import { esIdAccion, ETIQUETAS_ACCION } from "@/lib/catalogo-acciones";
import { textoErrorTrabajo } from "@/lib/error-trabajo";
import { fechaHoraCorta } from "@/lib/formato-fecha";
import type { Trabajo } from "@/lib/tipos";

const ESTADOS: Record<Trabajo["estado"], string> = {
  en_marcha: "En marcha",
  hecho: "Hecho",
  error: "Error",
  interrumpido: "Interrumpido",
  cancelado: "Cancelado",
};

function fecha(valor: string | null): string {
  return valor ? fechaHoraCorta(valor) : "—";
}

function etiqueta(accion: string): string {
  return esIdAccion(accion) ? ETIQUETAS_ACCION[accion] : accion;
}

function textoEstadoFila(
  trabajo: Trabajo,
  cancelando: boolean,
  inexistente: boolean,
): string {
  if (cancelando) return "Cancelando…";
  if (inexistente) return "El trabajo ya no existe.";
  return ESTADOS[trabajo.estado];
}

function FilaTrabajo({ inicial }: { inicial: Trabajo }) {
  const [base, setBase] = useState(inicial);
  const [inicialAnterior, setInicialAnterior] = useState(inicial);

  if (inicial !== inicialAnterior) {
    setInicialAnterior(inicial);
    setBase(inicial);
  }

  const {
    cancelar,
    cancelando,
    inexistente,
    mensaje,
    pendiente,
    trabajo: trabajoSeguido,
  } = useCancelacionTrabajo({
    trabajoBase: base,
    trabajoRecibido: inicial,
    actualizarTrabajo: setBase,
  });
  const trabajo = trabajoSeguido ?? base;
  const error = trabajo.estado === "error" ? textoErrorTrabajo(trabajo.error) : null;

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
        {textoEstadoFila(trabajo, cancelando, inexistente)}
        {error && !inexistente ? (
          <span className="mt-1 block text-xs text-ambar">{error}</span>
        ) : null}
      </td>
      <td className="px-4 py-4 font-mono text-xs">
        {Math.round(trabajo.progreso * 100)} %
      </td>
      <td className="whitespace-nowrap px-4 py-4">{fecha(trabajo.inicio)}</td>
      <td className="whitespace-nowrap px-4 py-4">{fecha(trabajo.fin)}</td>
      <td className="px-4 py-4">
        {trabajo.estado === "en_marcha" && !inexistente ? (
          <button
            type="button"
            aria-label="Cancelar el trabajo"
            disabled={pendiente || cancelando}
            onClick={cancelar}
            className={BOTON_CANCELAR}
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
    <div className="relative mt-8 overflow-x-auto border border-borde bg-superficie">
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
