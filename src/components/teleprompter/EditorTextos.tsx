"use client";

import { useState, type CSSProperties } from "react";

import { useGuardarTextosGuion } from "@/components/guion/useGuardarTextosGuion";
import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import type { TextosEscena } from "@/lib/acciones-teleprompter";
import { cambiarTexto, limpio, valido } from "@/lib/textos-guion";
import type { EscenaTeleprompter, Teleprompter } from "@/lib/tipos";

const BOTON =
  "inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border px-4 py-2 font-semibold transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-40";

export function EditorTextos({
  curso,
  numero,
  version,
  escena,
  alGuardado,
  alCancelar,
}: {
  curso: string;
  numero: number;
  // La versión del guion cargado: se guarda contra la que había al empezar a editar.
  version: string;
  escena: EscenaTeleprompter;
  alGuardado: (teleprompter: Teleprompter) => void;
  alCancelar: () => void;
}) {
  const voz = escena.modo === "voz";
  const textosDe = (de: EscenaTeleprompter) =>
    de.modo === "voz" ? de.cues.map(({ texto }) => texto) : [...de.puntos];
  // Los textos con los que se compara; la versión con la que se guarda la guarda el hook.
  const [originales] = useState(() => textosDe(escena));
  const [textos, setTextos] = useState(originales);
  const { error, setError, recargando, guardando, llegoNuevo, guardar: guardarCambio, recargar } =
    useGuardarTextosGuion({ curso, numero, version, alGuardado, refrescarAlGuardar: false });
  const etiqueta = voz ? "Frase" : "Punto";
  const sinGuardar = textos.some((texto, i) => texto !== originales[i]);

  // Salir de la página (recargar, cerrar o un enlace interno) con texto sin guardar lo perdería:
  // se pregunta antes.
  useAvisoAlSalir(sinGuardar);

  function cambiar(i: number, valor: string) {
    setTextos((actuales) => cambiarTexto(actuales, i, valor));
  }

  function guardar() {
    if (recargando) return;
    const limpios = textos.map(limpio);
    if (!limpios.every(valido)) {
      setError({ mensaje: "Cada texto tiene que tener entre 1 y 1000 caracteres.", conflicto: false });
      return;
    }
    const cambio: TextosEscena = voz
      ? { id: escena.id, cues: limpios }
      : { id: escena.id, puntos: limpios };
    guardarCambio([cambio]);
  }

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-2.5 bg-fondo py-2 text-sm">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando || recargando}
          className={`${BOTON} border-marca bg-marca text-white`}
        >
          Guardar texto
        </button>
        <button
          type="button"
          onClick={alCancelar}
          disabled={guardando}
          className={`${BOTON} border-borde bg-superficie`}
        >
          Cancelar
        </button>
        {recargando && !llegoNuevo ? (
          <p role="status" className="m-0 text-tenue">
            Cargando el guion nuevo…
          </p>
        ) : null}
        {llegoNuevo ? (
          <p role="alert" className="m-0 flex flex-wrap items-center gap-2.5 text-ambar">
            Ha llegado el guion nuevo. ¿Descartas lo que has escrito?
            <button
              type="button"
              onClick={alCancelar}
              className={`${BOTON} min-h-9 border-ambar bg-transparent px-3 py-1.5 text-sm text-ambar`}
            >
              Descartar lo escrito
            </button>
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="m-0 flex flex-wrap items-center gap-2.5 text-ambar">
            {error.mensaje}
            {error.conflicto ? (
              <button
                type="button"
                onClick={recargar}
                className={`${BOTON} min-h-9 border-ambar bg-transparent px-3 py-1.5 text-sm text-ambar`}
              >
                Recargar
              </button>
            ) : null}
          </p>
        ) : null}
      </div>
      {textos.map((texto, i) => (
        <textarea
          key={i}
          aria-label={`${etiqueta} ${i + 1}`}
          rows={1}
          value={texto}
          disabled={guardando}
          readOnly={recargando}
          onChange={(evento) => cambiar(i, evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
          style={{ fontSize: voz ? "var(--letra)" : "calc(var(--letra) * 0.8)" } as CSSProperties}
          className="field-sizing-content mx-auto block w-full max-w-[30ch] resize-none rounded-lg border border-dashed border-borde bg-transparent px-2 py-1 leading-[1.45] font-semibold tracking-[-0.01em] text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-60"
        />
      ))}
    </div>
  );
}
