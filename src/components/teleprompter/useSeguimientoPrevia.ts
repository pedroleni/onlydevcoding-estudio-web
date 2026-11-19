"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { generarPreviaGrabacion } from "@/lib/acciones-teleprompter";
import type { EstadoPrevia, Trabajo } from "@/lib/tipos";

// Tras acabar en `hecho`: cuántas veces se piden los datos nuevos y cuánto se espera a cada uno.
const MAXIMO_REFRESCOS = 3;
const ESPERA_REFRESCO_MS = 5000;

export type SeguimientoPrevia = {
  // El trabajo que se enseña: el que se sigue desde aquí o, si no, el de los datos de la página.
  trabajo: Trabajo | null;
  // En marcha, o hecho a la espera de que lleguen los datos con la previa nueva.
  generando: boolean;
  // Hecho, pero tras los refrescos la previa nueva no aparece.
  perdida: boolean;
  pidiendo: boolean;
  mensaje: string | null;
  generar: () => void;
};

type Espera = { versionAntes: number | null; intentos: number };

// El trabajo de la vista previa se sigue en la sesión del teleprompter, no en el panel: así no se
// pierde al ocultarlo y el refresco al acabar llega igual.
export function useSeguimientoPrevia({
  curso,
  numero,
  previa,
}: {
  curso: string;
  numero: number;
  previa: EstadoPrevia;
}): SeguimientoPrevia {
  const router = useRouter();
  const [seguido, setSeguido] = useState<Trabajo | null>(null);
  const [espera, setEspera] = useState<Espera | null>(null);
  const [perdida, setPerdida] = useState<{ versionAntes: number | null } | null>(null);
  const [previaAnterior, setPreviaAnterior] = useState(previa);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [desaparecido, setDesaparecido] = useState<number | null>(null);
  const [pidiendo, iniciar] = useTransition();

  const esNueva = (versionAntes: number | null) =>
    previa.existe && previa.version !== null && previa.version !== versionAntes;

  // Se deja de esperar. El trabajo hecho se queda como seguido: si los datos de la página no
  // llegaron, su trabajo sería aún el de «en marcha» y se volvería a consultar sin fin.
  function rendirse(versionAntes: number | null) {
    setEspera(null);
    setPerdida({ versionAntes });
  }

  // Llegan datos nuevos de la página (cada router.refresh() trae un objeto nuevo).
  if (previa !== previaAnterior) {
    setPreviaAnterior(previa);
    if (espera) {
      if (esNueva(espera.versionAntes)) {
        setEspera(null);
        setSeguido(null);
      } else if (espera.intentos >= MAXIMO_REFRESCOS) {
        rendirse(espera.versionAntes);
      } else {
        setEspera({ ...espera, intentos: espera.intentos + 1 });
      }
    } else {
      // Sin espera, manda el trabajo de los datos de la página.
      setSeguido(null);
      if (perdida && esNueva(perdida.versionAntes)) setPerdida(null);
    }
  }

  // Cada espera nueva pide los datos otra vez; si no llegan en 5 s, cuenta como otro intento.
  useEffect(() => {
    if (!espera) return;
    if (espera.intentos >= MAXIMO_REFRESCOS) {
      const temporizador = setTimeout(() => rendirse(espera.versionAntes), 0);
      return () => clearTimeout(temporizador);
    }
    // El primer refresco lo hace el hook general al detectar que el trabajo ha terminado.
    if (espera.intentos > 0) router.refresh();
    const temporizador = setTimeout(() => {
      if (espera.intentos + 1 >= MAXIMO_REFRESCOS) {
        rendirse(espera.versionAntes);
      } else {
        setEspera({ ...espera, intentos: espera.intentos + 1 });
      }
    }, ESPERA_REFRESCO_MS);
    return () => clearTimeout(temporizador);
  }, [espera, router]);

  const trabajo = useSeguimientoTrabajo({
    trabajo: seguido ?? previa.trabajo,
    refrescarAlTerminar: false,
    alDesaparecer(id) {
      setDesaparecido(id);
      setMensaje("El trabajo ya no existe.");
    },
    alTerminar(leido) {
      setSeguido(leido);
      if (leido.estado === "hecho") {
        setEspera({
          versionAntes: previa.existe ? previa.version : null,
          intentos: 0,
        });
        router.refresh();
      }
    },
  });

  function generar() {
    setMensaje(null);
    iniciar(async () => {
      const resultado = await generarPreviaGrabacion(curso, numero);
      if (resultado.ok) {
        setEspera(null);
        setPerdida(null);
        setSeguido(resultado.trabajo);
      } else {
        setMensaje(resultado.mensaje);
      }
    });
  }

  return {
    trabajo,
    generando:
      (trabajo?.estado === "en_marcha" && trabajo.id !== desaparecido) || espera !== null,
    perdida: perdida !== null,
    pidiendo,
    mensaje,
    generar,
  };
}
