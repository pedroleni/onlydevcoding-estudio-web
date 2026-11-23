"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  esMicroDelPortatil,
  MENSAJE_ABRIENDO_MICRO,
  mensajeFalloMicro,
  separarMicros,
  type Microfono,
} from "@/lib/teleprompter/microfonos";

type OpcionesMicros = {
  micro: string;
  alEstado: (texto: string) => void;
  abrirMicro: () => Promise<{ flujo: MediaStream; micro: string }>;
};

function nombrePista(flujo: MediaStream): string {
  return flujo.getAudioTracks()[0]?.label ?? "";
}

export function useMicros({ micro, alEstado, abrirMicro }: OpcionesMicros) {
  const [micros, setMicros] = useState<Microfono[]>([]);
  const [nombrePredeterminado, setNombrePredeterminado] = useState("");
  // El nombre de la pista abierta solo vale para el micrófono con el que se abrió.
  const [abierto, setAbierto] = useState({ micro: "", nombre: "" });
  const [abriendoMicro, setAbriendoMicro] = useState(false);
  const montadoRef = useRef(false);

  const actualizarMicros = useCallback(async () => {
    const dispositivos = navigator.mediaDevices;
    if (!dispositivos) return;
    try {
      const lista = separarMicros(await dispositivos.enumerateDevices());
      if (!montadoRef.current) return;
      setMicros(lista.micros);
      setNombrePredeterminado(lista.nombrePredeterminado);
    } catch {
      // La lista es una ayuda: sin ella sigue disponible el micrófono predeterminado.
    }
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    const dispositivos = navigator.mediaDevices;
    if (!dispositivos) return () => {
      montadoRef.current = false;
    };
    const alCambiarDispositivos = () => void actualizarMicros();
    // Fuera del cuerpo del efecto, para no poner estado de forma síncrona al montar.
    queueMicrotask(alCambiarDispositivos);
    dispositivos.addEventListener("devicechange", alCambiarDispositivos);
    return () => {
      montadoRef.current = false;
      dispositivos.removeEventListener("devicechange", alCambiarDispositivos);
    };
  }, [actualizarMicros]);

  const abrirMicroConNivel = async (): Promise<MediaStream> => {
    setAbriendoMicro(true);
    try {
      const { flujo, micro: abiertoDeVerdad } = await abrirMicro();
      if (montadoRef.current) setAbierto({ micro: abiertoDeVerdad, nombre: nombrePista(flujo) });
      void actualizarMicros();
      return flujo;
    } finally {
      if (montadoRef.current) setAbriendoMicro(false);
    }
  };

  const probarMicro = async () => {
    alEstado(MENSAJE_ABRIENDO_MICRO);
    try {
      const flujo = await abrirMicroConNivel();
      if (!montadoRef.current) return;
      const nombre = nombrePista(flujo) || "micrófono predeterminado";
      alEstado(`Micrófono listo: ${nombre}. Habla y mira la barra de nivel.`);
    } catch (error) {
      if (montadoRef.current) alEstado(mensajeFalloMicro(error));
    }
  };

  const nombreElegido = micros.find(({ id }) => id === micro)?.nombre ?? "";
  const nombreAbierto = abierto.micro === micro ? abierto.nombre : "";
  const nombreEfectivo = nombreAbierto || (micro === "" ? nombrePredeterminado : nombreElegido);

  return {
    micros,
    microDelPortatil: esMicroDelPortatil(nombreEfectivo),
    abriendoMicro,
    abrirMicroConNivel,
    probarMicro,
  };
}
