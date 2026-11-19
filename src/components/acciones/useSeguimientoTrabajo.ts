"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useState } from "react";

import { TrabajoInexistente } from "@/lib/error-trabajo";
import type { Trabajo } from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

const CONSULTA_MS = 2000;

type AvisosConsulta = {
  alLeer: (leido: Trabajo) => void;
  alDesaparecer: (id: number) => void;
  alTerminar: (terminado: Trabajo) => void;
};

// Pregunta por el trabajo cada CONSULTA_MS mientras la pestaña está visible y siga en marcha.
// Devuelve la limpieza del efecto.
function consultarHastaTerminar(id: number, avisos: AvisosConsulta): () => void {
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
    let desaparecido = false;
    try {
      leido = await leerTrabajo(id);
    } catch (causa) {
      // Un fallo transitorio no detiene el seguimiento; un 404 sí.
      desaparecido = causa instanceof TrabajoInexistente;
    }
    consultando = false;
    if (!vivo) return;
    if (desaparecido) {
      avisos.alDesaparecer(id);
      return;
    }
    if (leido) avisos.alLeer(leido);
    if (!leido || leido.estado === "en_marcha") {
      programar();
    } else {
      avisos.alTerminar(leido);
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
}

export function useSeguimientoTrabajo({
  trabajo,
  alTerminar,
  alDesaparecer,
  refrescarAlTerminar = true,
}: {
  trabajo: Trabajo | null;
  alTerminar?: (trabajo: Trabajo) => void;
  // La API responde 404: el trabajo ya no existe y se deja de preguntar por él.
  alDesaparecer?: (id: number) => void;
  refrescarAlTerminar?: boolean;
}): Trabajo | null {
  const router = useRouter();
  const [seguido, setSeguido] = useState<Trabajo | null>(null);
  const [trabajoAnterior, setTrabajoAnterior] = useState(trabajo);
  // Los ids no se reutilizan: un trabajo que ya no existe no se vuelve a consultar aunque
  // lleguen datos viejos que aún lo den por «en marcha».
  const [inexistente, setInexistente] = useState<number | null>(null);
  const avisarTerminado = useEffectEvent((terminado: Trabajo) => {
    alTerminar?.(terminado);
  });
  const avisarDesaparecido = useEffectEvent((idDesaparecido: number) => {
    alDesaparecer?.(idDesaparecido);
  });

  if (trabajo !== trabajoAnterior) {
    setTrabajoAnterior(trabajo);
    setSeguido(null);
  }

  const actual = seguido?.id === trabajo?.id ? seguido : trabajo;
  const id =
    actual?.estado === "en_marcha" && actual.id !== inexistente ? actual.id : null;

  useEffect(() => {
    if (id === null) return;
    return consultarHastaTerminar(id, {
      alLeer: setSeguido,
      alDesaparecer(idDesaparecido) {
        setInexistente(idDesaparecido);
        avisarDesaparecido(idDesaparecido);
      },
      alTerminar(terminado) {
        avisarTerminado(terminado);
        if (refrescarAlTerminar) router.refresh();
      },
    });
  }, [id, refrescarAlTerminar, router]);

  return actual;
}
