"use client";

import { useMemo, useState } from "react";

import { planDe } from "@/components/teleprompter/estadoEscena";
import type { Preferencias } from "@/lib/teleprompter/preferencias";
import type {
  EscenaTeleprompter,
  TomaGuardada,
  Teleprompter as DatosTeleprompter,
} from "@/lib/tipos";

// Se abre en la primera escena de voz sin grabar.
function indiceInicial(escenas: EscenaTeleprompter[]) {
  const pendiente = escenas.findIndex(({ modo, grabada }) => modo === "voz" && !grabada);
  return pendiente >= 0 ? pendiente : 0;
}

// El guion, la escena visible y el estado de la sesión del teleprompter.
export function useEstadoSesion(datos: DatosTeleprompter, pref: Preferencias) {
  // El guion con el que se trabaja: el de la página o, tras guardar un texto, el que devuelve
  // la API (con su versión nueva) sin esperar a que se refresque la página.
  const [guion, setGuion] = useState(datos);
  const [datosAnteriores, setDatosAnteriores] = useState(datos);
  if (datos !== datosAnteriores) {
    setDatosAnteriores(datos);
    setGuion(datos);
  }
  const escenas = useMemo(
    () => guion.escenas.filter(({ modo }) => (modo as string) !== "animacion"),
    [guion.escenas],
  );
  const [indice, setIndice] = useState(() => indiceInicial(escenas));
  const escena = escenas.at(indice);
  // null: el estado inicial de la escena, que se calcula al pintar con las preferencias ya
  // leídas (tras hidratar), así que la vista «puntos» guardada se refleja desde el principio.
  const [estadoPropio, setEstado] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const plan = useMemo(() => (escena ? planDe(escena, pref.ritmo) : null), [escena, pref.ritmo]);
  return {
    guion,
    setGuion,
    escenas,
    indice,
    setIndice,
    escena,
    estadoPropio,
    setEstado,
    editando,
    setEditando,
    plan,
  };
}

// Las escenas ya grabadas: las que lo estaban al cargar y las subidas en esta sesión.
export function useGrabadas(escenas: EscenaTeleprompter[], tomas: Record<string, TomaGuardada>) {
  return useMemo(
    () =>
      new Set([
        ...escenas.filter(({ grabada }) => grabada).map(({ id }) => id),
        ...Object.keys(tomas),
      ]),
    [escenas, tomas],
  );
}
