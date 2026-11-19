"use client";

import { useEffect, useRef, useState } from "react";

import { CampoGuion, PieEditorGuion } from "@/components/guion/PartesEditorGuion";
import { useGuardarTextosGuion } from "@/components/guion/useGuardarTextosGuion";
import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import { cambiarTexto, limpio, valido } from "@/lib/textos-guion";
import type { Teleprompter } from "@/lib/tipos";

type Gancho = Teleprompter["ganchos"][number];

export function EditorGanchos({
  curso,
  numero,
  version,
  ganchos,
  bloqueo = null,
  alGuardado,
  alCancelar,
}: {
  curso: string;
  numero: number;
  version: string;
  ganchos: Gancho[];
  // Texto que explica por qué no se puede guardar ahora (un trabajo está leyendo el guion).
  bloqueo?: string | null;
  // Recibe el teleprompter devuelto: su versión sirve para el siguiente editor sin esperar al
  // refresco.
  alGuardado: (teleprompter: Teleprompter) => void;
  alCancelar: () => void;
}) {
  const seccion = useRef<HTMLElement>(null);
  const [originales] = useState(() => ganchos.map(({ texto }) => texto));
  const [textos, setTextos] = useState(originales);
  const guardado = useGuardarTextosGuion({ curso, numero, version, alGuardado });
  const sinGuardar = textos.some((texto, indice) => texto !== originales[indice]);
  const textosValidos = textos.every(valido);

  useAvisoAlSalir(sinGuardar);

  useEffect(() => {
    seccion.current?.querySelector("textarea")?.focus();
  }, []);

  function guardar() {
    if (guardado.recargando || bloqueo || !sinGuardar || !textosValidos) return;
    const paraGuardar = ganchos.map(({ id }, indice) => ({
      id,
      texto: limpio(textos[indice]),
    }));
    guardado.guardar([], paraGuardar);
  }

  return (
    <section ref={seccion} className="border border-borde bg-superficie p-5" aria-label="Editar ganchos">
      <h3 className="text-lg font-semibold">Editar ganchos</h3>
      <div className="mt-5 grid gap-5">
        {ganchos.map((gancho, indice) => (
          <CampoGuion
            key={gancho.id}
            etiqueta={gancho.titulo}
            nombreAccesible={`Texto de ${gancho.titulo}`}
            valor={textos[indice]}
            guardando={guardado.guardando}
            recargando={guardado.recargando}
            alCambiar={(valor) => setTextos((actuales) => cambiarTexto(actuales, indice, valor))}
          />
        ))}
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
