"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import {
  cancelarTrabajo,
  lanzarAccion,
  type OpcionesAccion,
} from "@/lib/acciones-estudio";
import type { EstadoAccion, Trabajo } from "@/lib/tipos";

const BOTON_PRINCIPAL =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-marca bg-carbon px-4 text-sm font-semibold text-texto transition-colors hover:enabled:bg-marca disabled:cursor-default disabled:opacity-40";
const BOTON_CANCELAR =
  "inline-flex min-h-10 cursor-pointer items-center justify-center border border-rojo px-3 text-sm font-semibold text-rojo transition-colors hover:enabled:bg-rojo hover:enabled:text-fondo disabled:cursor-default disabled:opacity-40";
const FECHA = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
});

function fechaTrabajo(trabajo: Trabajo): string {
  return FECHA.format(new Date(trabajo.fin ?? trabajo.inicio));
}

function EstadoTrabajo({ trabajo }: { trabajo: Trabajo }) {
  if (trabajo.estado === "en_marcha") {
    const porcentaje = Math.round(trabajo.progreso * 100);
    return (
      <span role="status" className="text-sm text-tenue">
        {porcentaje > 0 ? `En marcha… ${porcentaje} %` : "En marcha…"}
      </span>
    );
  }

  const texto =
    trabajo.estado === "hecho"
      ? "Hecho"
      : trabajo.estado === "error"
        ? `Falló: ${trabajo.error ?? "error desconocido"}`
        : trabajo.estado === "interrumpido"
          ? "Interrumpido"
          : "Cancelado";

  return (
    <span role="status" className="text-sm text-tenue">
      <span className={trabajo.estado === "hecho" ? "text-verde" : "text-ambar"}>
        {texto}
      </span>{" "}
      · <time dateTime={trabajo.fin ?? trabajo.inicio}>{fechaTrabajo(trabajo)}</time>
    </span>
  );
}

export function BotonAccion({
  curso,
  numero,
  accion,
  opciones = {},
  textoBoton,
  confirmar,
}: {
  curso: string;
  numero: number;
  accion: EstadoAccion;
  opciones?: OpcionesAccion;
  textoBoton?: string;
  confirmar?: string;
}) {
  const router = useRouter();
  const [trabajoBase, setTrabajoBase] = useState(accion.ultimo);
  const [ultimoRecibido, setUltimoRecibido] = useState(accion.ultimo);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  if (accion.ultimo !== ultimoRecibido) {
    setUltimoRecibido(accion.ultimo);
    setTrabajoBase(accion.ultimo);
  }

  const trabajo = useSeguimientoTrabajo({
    trabajo: trabajoBase,
    alTerminar: setTrabajoBase,
  });

  function lanzar() {
    if (confirmar && !window.confirm(confirmar)) return;
    setMensaje(null);
    iniciar(async () => {
      const resultado = await lanzarAccion(curso, numero, accion.id, opciones);
      if (resultado.ok) setTrabajoBase(resultado.trabajo);
      else setMensaje(resultado.mensaje);
    });
  }

  function cancelar() {
    if (!trabajo) return;
    setMensaje(null);
    iniciar(async () => {
      const resultado = await cancelarTrabajo(trabajo.id);
      if (resultado.ok) {
        setTrabajoBase(resultado.trabajo);
        router.refresh();
      } else {
        setMensaje(resultado.mensaje);
      }
    });
  }

  const enMarcha = trabajo?.estado === "en_marcha";

  return (
    <div className="grid justify-items-start gap-2">
      {trabajo ? <EstadoTrabajo trabajo={trabajo} /> : null}
      {enMarcha ? (
        <button
          type="button"
          className={BOTON_CANCELAR}
          disabled={pendiente}
          onClick={cancelar}
        >
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          className={BOTON_PRINCIPAL}
          disabled={!accion.disponible || pendiente}
          onClick={lanzar}
        >
          {textoBoton ?? accion.etiqueta}
        </button>
      )}
      {!accion.disponible && accion.motivo ? (
        <p className="m-0 text-sm text-tenue">{accion.motivo}</p>
      ) : null}
      {mensaje ? <p role="alert" className="m-0 text-sm text-ambar">{mensaje}</p> : null}
    </div>
  );
}
