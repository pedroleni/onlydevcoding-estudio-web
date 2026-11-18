"use client";

import Link from "next/link";
import { useEffect, useEffectEvent, useId, useState, useTransition } from "react";

import { useCancelacionTrabajo } from "@/components/acciones/useCancelacionTrabajo";
import { lanzarAccion, type OpcionesAccion } from "@/lib/acciones-estudio";
import { textoErrorTrabajo } from "@/lib/error-trabajo";
import { fechaHoraCorta } from "@/lib/formato-fecha";
import type { EstadoAccion, Trabajo } from "@/lib/tipos";

const BOTON_PRINCIPAL =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-marca bg-carbon px-4 text-sm font-semibold text-texto transition-colors hover:enabled:bg-marca disabled:cursor-default disabled:opacity-40";
export const BOTON_CANCELAR =
  "inline-flex min-h-10 cursor-pointer items-center justify-center border border-rojo px-3 text-sm font-semibold text-rojo transition-colors hover:enabled:bg-rojo hover:enabled:text-fondo disabled:cursor-default disabled:opacity-40";
const OTRO_TRABAJO_EN_MARCHA = "Ya hay un trabajo en marcha";

export function textoEstadoTrabajo(trabajo: Trabajo): string {
  if (trabajo.estado === "hecho") return "Hecho";
  if (trabajo.estado === "interrumpido") return "Interrumpido";
  if (trabajo.estado === "cancelado") return "Cancelado";
  if (trabajo.estado === "error") {
    const motivo = textoErrorTrabajo(trabajo.error);
    return motivo ? `Falló: ${motivo}` : "Falló";
  }
  return "En marcha";
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

  const fecha = trabajo.fin ?? trabajo.inicio;
  return (
    <span role="status" className="text-sm text-tenue">
      <span className={trabajo.estado === "hecho" ? "text-verde" : "text-ambar"}>
        {textoEstadoTrabajo(trabajo)}
      </span>{" "}
      · <time dateTime={fecha}>{fechaHoraCorta(fecha)}</time>
    </span>
  );
}

export function BotonAccion({
  curso,
  numero,
  accion,
  opciones = {},
  objetivo,
  textoBoton,
  nombreAccesible,
  confirmar,
  ocultarAnterior = false,
  alLanzar,
  alCambiarTrabajo,
}: {
  curso: string;
  numero: number;
  accion: EstadoAccion;
  opciones?: OpcionesAccion;
  objetivo?: string;
  textoBoton?: string;
  // Nombre para el lector de pantalla cuando el texto visible se repite (p. ej. un botón por short).
  nombreAccesible?: string;
  confirmar?: string;
  // No enseña un trabajo terminado que no se haya visto en marcha ni lanzado desde aquí: así un
  // «Hecho» antiguo no se lee como el resultado de lo que se acaba de pedir.
  ocultarAnterior?: boolean;
  alLanzar?: (trabajo: Trabajo) => void;
  // Avisa de cada cambio del trabajo que sigue este botón (null si no hay o ya no existe).
  alCambiarTrabajo?: (trabajo: Trabajo | null) => void;
}) {
  const idMotivo = useId();
  const trabajoRecibido = objetivo
    ? accion.ultimos[objetivo] ?? null
    : accion.ultimo;
  const [trabajoBase, setTrabajoBase] = useState(trabajoRecibido);
  const [ultimoRecibido, setUltimoRecibido] = useState(trabajoRecibido);
  const [accionRecibida, setAccionRecibida] = useState(accion);
  const [propio, setPropio] = useState<number | null>(
    trabajoRecibido?.estado === "en_marcha" ? trabajoRecibido.id : null,
  );
  const [mensajeLanzamiento, setMensajeLanzamiento] = useState<string | null>(null);
  const [lanzando, iniciarLanzamiento] = useTransition();

  if (trabajoRecibido !== ultimoRecibido) {
    setUltimoRecibido(trabajoRecibido);
    setTrabajoBase(trabajoRecibido);
    if (trabajoRecibido?.estado === "en_marcha") setPropio(trabajoRecibido.id);
  }
  // Datos nuevos de la acción (cambia su estado o se refresca la lección): el mensaje del
  // último lanzamiento ya no describe lo que hay.
  if (accion !== accionRecibida) {
    setAccionRecibida(accion);
    setMensajeLanzamiento(null);
  }

  const {
    cancelar,
    cancelando,
    inexistente,
    mensaje: mensajeCancelacion,
    pendiente: cancelandoPendiente,
    prepararNuevoTrabajo,
    trabajo: trabajoSeguido,
  } = useCancelacionTrabajo({
    trabajoBase,
    trabajoRecibido,
    actualizarTrabajo: setTrabajoBase,
  });
  const trabajo = inexistente ? null : trabajoSeguido;
  const trabajoVisible =
    trabajo &&
    (!ocultarAnterior || trabajo.estado === "en_marcha" || trabajo.id === propio)
      ? trabajo
      : null;

  const avisarCambio = useEffectEvent((actual: Trabajo | null) => {
    alCambiarTrabajo?.(actual);
  });
  useEffect(() => {
    avisarCambio(trabajo);
  }, [trabajo]);

  function lanzar() {
    if (confirmar && !window.confirm(confirmar)) return;
    setMensajeLanzamiento(null);
    prepararNuevoTrabajo();
    iniciarLanzamiento(async () => {
      const resultado = await lanzarAccion(
        curso,
        numero,
        accion.id,
        objetivo ? { short: objetivo } : opciones,
      );
      if (resultado.ok) {
        setPropio(resultado.trabajo.id);
        setTrabajoBase(resultado.trabajo);
        alLanzar?.(resultado.trabajo);
      } else {
        setMensajeLanzamiento(resultado.mensaje);
      }
    });
  }

  const enMarcha = trabajo?.estado === "en_marcha";
  const pendiente = lanzando || cancelandoPendiente;
  const mensaje = mensajeCancelacion ?? mensajeLanzamiento;
  const motivo = !accion.disponible && accion.motivo ? accion.motivo : null;

  return (
    <div className="grid justify-items-start gap-2">
      {cancelando ? (
        <span role="status" className="text-sm text-tenue">Cancelando…</span>
      ) : inexistente ? (
        <span role="status" className="text-sm text-ambar">El trabajo ya no existe.</span>
      ) : trabajoVisible ? (
        <EstadoTrabajo trabajo={trabajoVisible} />
      ) : null}
      {enMarcha ? (
        <button
          type="button"
          className={BOTON_CANCELAR}
          aria-label="Cancelar el trabajo"
          disabled={pendiente || cancelando}
          onClick={cancelar}
        >
          Cancelar
        </button>
      ) : (
        <button
          type="button"
          className={BOTON_PRINCIPAL}
          aria-label={nombreAccesible}
          aria-describedby={motivo ? idMotivo : undefined}
          disabled={!accion.disponible || pendiente}
          onClick={lanzar}
        >
          {textoBoton ?? accion.etiqueta}
        </button>
      )}
      {motivo ? (
        <p id={idMotivo} className="m-0 text-sm text-tenue">{motivo}</p>
      ) : null}
      {mensaje ? (
        <p role="alert" className="m-0 text-sm text-ambar">
          {mensaje}
          {mensaje.startsWith(OTRO_TRABAJO_EN_MARCHA) ? (
            <>
              {" "}
              <Link href="/trabajos" className="font-semibold text-marca underline hover:text-texto">
                Ver trabajos
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
