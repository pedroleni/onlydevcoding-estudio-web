"use client";

import { useEffect, useRef, useState } from "react";

import { CampoGuion, PieEditorGuion } from "@/components/guion/PartesEditorGuion";
import { useGuardarTextosGuion } from "@/components/guion/useGuardarTextosGuion";
import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import type { TextosEscena } from "@/lib/acciones-teleprompter";
import { cambiarTexto, limpio, valido } from "@/lib/textos-guion";
import type { EscenaTeleprompter, Teleprompter } from "@/lib/tipos";

export function EditorEscenaGuion({
  curso,
  numero,
  version,
  escena,
  bloqueo = null,
  alGuardado,
  alCancelar,
}: {
  curso: string;
  numero: number;
  version: string;
  escena: EscenaTeleprompter;
  // Texto que explica por qué no se puede guardar ahora (un trabajo está leyendo el guion).
  bloqueo?: string | null;
  // Recibe el teleprompter devuelto: su versión sirve para el siguiente editor sin esperar al
  // refresco.
  alGuardado: (teleprompter: Teleprompter) => void;
  alCancelar: () => void;
}) {
  const seccion = useRef<HTMLElement>(null);
  const [base] = useState(() => ({
    cues: escena.cues.map(({ texto }) => texto),
    puntos: [...escena.puntos],
  }));
  const [cues, setCues] = useState(base.cues);
  const [puntos, setPuntos] = useState(base.puntos);
  const guardado = useGuardarTextosGuion({ curso, numero, version, alGuardado });
  const cambioCues = cues.some((texto, indice) => texto !== base.cues[indice]);
  const cambioPuntos = puntos.some((texto, indice) => texto !== base.puntos[indice]);
  const sinGuardar = cambioCues || cambioPuntos;
  const textosValidos = [...cues, ...puntos].every(valido);

  useAvisoAlSalir(sinGuardar);

  useEffect(() => {
    seccion.current?.querySelector("textarea")?.focus();
  }, []);

  function guardar() {
    if (guardado.recargando || bloqueo || !sinGuardar || !textosValidos) return;
    const cuesLimpios = cues.map(limpio);
    const puntosLimpios = puntos.map(limpio);
    const cambio: TextosEscena = escena.modo === "voz"
      ? { id: escena.id, cues: cuesLimpios }
      : {
          id: escena.id,
          ...(cuesLimpios.length === 0 ? {} : { cues: cuesLimpios }),
          ...(puntosLimpios.length === 0 ? {} : { puntos: puntosLimpios }),
        };
    guardado.guardar([cambio]);
  }

  function campos(etiqueta: "Frase" | "Punto", textos: string[], actualiza: typeof setCues) {
    return textos.map((texto, indice) => (
      <CampoGuion
        key={`${etiqueta}-${indice}`}
        etiqueta={`${etiqueta} ${indice + 1}`}
        nombreAccesible={`${etiqueta} ${indice + 1}`}
        valor={texto}
        guardando={guardado.guardando}
        recargando={guardado.recargando}
        alCambiar={(valor) => actualiza((actuales) => cambiarTexto(actuales, indice, valor))}
      />
    ));
  }

  return (
    <section ref={seccion} className="border border-borde bg-superficie p-5" aria-label={`Editar ${escena.id}`}>
      <h4 className="text-lg font-semibold">Editar textos de {escena.id}</h4>
      <div className="mt-5 grid gap-5">
        {campos("Frase", cues, setCues)}
        {escena.modo === "camara" ? campos("Punto", puntos, setPuntos) : null}
      </div>
      <PieEditorGuion
        {...guardado.pie}
        puedeGuardar={sinGuardar && textosValidos}
        bloqueo={bloqueo}
        alGuardar={guardar}
        alCancelar={alCancelar}
      />
    </section>
  );
}
