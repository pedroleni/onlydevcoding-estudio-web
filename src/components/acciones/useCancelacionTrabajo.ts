"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { cancelarTrabajo } from "@/lib/acciones-estudio";
import type { Trabajo } from "@/lib/tipos";

const CONFIRMAR_CANCELACION = "¿Cancelar el trabajo en marcha?";

function haTerminado(trabajo: Trabajo | null): trabajo is Trabajo {
  return trabajo !== null && trabajo.estado !== "en_marcha";
}

export function useCancelacionTrabajo({
  trabajoBase,
  trabajoRecibido,
  actualizarTrabajo,
}: {
  trabajoBase: Trabajo | null;
  trabajoRecibido: Trabajo | null;
  actualizarTrabajo: (trabajo: Trabajo) => void;
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cancelandoId, setCancelandoId] = useState<number | null>(null);
  const [desaparecido, setDesaparecido] = useState<number | null>(null);
  const terminado = useRef<Trabajo | null>(
    haTerminado(trabajoRecibido) ? trabajoRecibido : null,
  );
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    const trabajoTerminado = haTerminado(trabajoRecibido)
      ? trabajoRecibido
      : null;
    terminado.current = trabajoTerminado;
  }, [trabajoRecibido]);

  const trabajo = useSeguimientoTrabajo({
    trabajo: trabajoBase,
    alTerminar: (trabajoTerminado) => {
      terminado.current = trabajoTerminado;
      actualizarTrabajo(trabajoTerminado);
      setCancelandoId(null);
      setMensaje(null);
    },
    alDesaparecer: (id) => {
      setDesaparecido(id);
      setCancelandoId(null);
      setMensaje(null);
    },
  });

  function prepararNuevoTrabajo() {
    setMensaje(null);
    terminado.current = null;
    setCancelandoId(null);
  }

  function cancelar() {
    if (!trabajo) return;
    // «Cancelar» aparece donde estaba el botón de lanzar: se confirma para que un segundo
    // clic impaciente no mate el trabajo recién lanzado.
    if (!window.confirm(CONFIRMAR_CANCELACION)) return;
    setMensaje(null);
    setCancelandoId(trabajo.id);
    iniciar(async () => {
      const resultado = await cancelarTrabajo(trabajo.id);
      if (terminado.current?.id === trabajo.id) return;

      if (resultado.ok) {
        actualizarTrabajo(resultado.trabajo);
        if (haTerminado(resultado.trabajo)) {
          terminado.current = resultado.trabajo;
          setCancelandoId(null);
          setMensaje(null);
          router.refresh();
        }
      } else {
        setCancelandoId(null);
        setMensaje(resultado.mensaje);
      }
    });
  }

  const inexistente = trabajo !== null && trabajo.id === desaparecido;
  const enMarcha = trabajo?.estado === "en_marcha" && !inexistente;
  const cancelando = enMarcha && cancelandoId === trabajo?.id;

  return {
    cancelar,
    cancelando,
    inexistente,
    mensaje: enMarcha ? mensaje : null,
    pendiente,
    prepararNuevoTrabajo,
    trabajo,
  };
}
