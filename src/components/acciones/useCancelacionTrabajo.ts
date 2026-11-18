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
  });

  function prepararNuevoTrabajo() {
    setMensaje(null);
    terminado.current = null;
    setCancelandoId(null);
  }

  function cancelar() {
    if (!trabajo) return;
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

  const cancelando =
    trabajo?.estado === "en_marcha" && cancelandoId === trabajo.id;

  return {
    cancelar,
    cancelando,
    mensaje: trabajo?.estado === "en_marcha" ? mensaje : null,
    pendiente,
    prepararNuevoTrabajo,
    trabajo,
  };
}
