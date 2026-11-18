"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";

import type { Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const CONSULTA_MS = 2000;

export function useSeguimientoTrabajo({
  trabajo,
  alTerminar,
  refrescarAlTerminar = true,
}: {
  trabajo: Trabajo | null;
  alTerminar?: (trabajo: Trabajo) => void;
  refrescarAlTerminar?: boolean;
}): Trabajo | null {
  const router = useRouter();
  const [seguido, setSeguido] = useState<Trabajo | null>(null);
  const [trabajoAnterior, setTrabajoAnterior] = useState(trabajo);
  const avisarTerminado = useEffectEvent((terminado: Trabajo) => {
    alTerminar?.(terminado);
  });

  if (trabajo !== trabajoAnterior) {
    setTrabajoAnterior(trabajo);
    setSeguido(null);
  }

  const actual = seguido?.id === trabajo?.id ? seguido : trabajo;
  const id = actual?.estado === "en_marcha" ? actual.id : null;

  useEffect(() => {
    if (id === null) return;

    let vivo = true;
    let consultando = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    const programar = () => {
      clearTimeout(temporizador);
      temporizador = undefined;
      if (vivo && !consultando && document.visibilityState === "visible") {
        temporizador = setTimeout(consultar, CONSULTA_MS);
      }
    };

    async function consultar() {
      temporizador = undefined;
      if (document.visibilityState !== "visible") return;
      consultando = true;
      let leido: Trabajo | null = null;
      try {
        leido = await leerTrabajo(id as number);
      } catch {
        // Un fallo transitorio no detiene el seguimiento.
      }
      consultando = false;
      if (!vivo) return;
      if (leido) setSeguido(leido);
      if (!leido || leido.estado === "en_marcha") {
        programar();
      } else {
        avisarTerminado(leido);
        if (refrescarAlTerminar) router.refresh();
      }
    }

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "visible") {
        programar();
      } else {
        clearTimeout(temporizador);
        temporizador = undefined;
      }
    };

    programar();
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => {
      vivo = false;
      clearTimeout(temporizador);
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
    };
  }, [id, refrescarAlTerminar, router]);

  return actual;
}
