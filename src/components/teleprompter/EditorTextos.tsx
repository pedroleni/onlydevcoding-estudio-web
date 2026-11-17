"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";

import { guardarTextos, type TextosEscena } from "@/lib/acciones-teleprompter";
import type { EscenaTeleprompter, Teleprompter } from "@/lib/tipos";

const BOTON =
  "inline-flex min-h-10 cursor-pointer items-center rounded-[10px] border px-4 py-2 font-semibold transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-40";

// Un texto por línea: los saltos se cambian por espacios y, al guardar, se juntan los espacios.
const sinSaltos = (texto: string) => texto.replace(/[\r\n]+/g, " ");
const limpio = (texto: string) => texto.replace(/\s+/g, " ").trim();
const valido = (texto: string) => {
  const longitud = Array.from(texto).length;
  return longitud >= 1 && longitud <= 1000;
};

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
  const router = useRouter();
  const voz = escena.modo === "voz";
  const [versionInicial] = useState(version);
  const [textos, setTextos] = useState(() =>
    voz ? escena.cues.map(({ texto }) => texto) : [...escena.puntos],
  );
  const [error, setError] = useState<{ mensaje: string; conflicto: boolean } | null>(null);
  const [guardando, iniciar] = useTransition();
  const etiqueta = voz ? "Frase" : "Punto";

  function cambiar(i: number, valor: string) {
    setTextos((actuales) => actuales.map((texto, j) => (j === i ? sinSaltos(valor) : texto)));
  }

  function guardar() {
    const limpios = textos.map(limpio);
    if (!limpios.every(valido)) {
      setError({ mensaje: "Cada texto tiene que tener entre 1 y 1000 caracteres.", conflicto: false });
      return;
    }
    setError(null);
    const cambio: TextosEscena = voz
      ? { id: escena.id, cues: limpios }
      : { id: escena.id, puntos: limpios };
    iniciar(async () => {
      const resultado = await guardarTextos(curso, numero, versionInicial, [cambio]);
      if (resultado.ok) {
        alGuardado(resultado.teleprompter);
      } else if (resultado.conflicto) {
        setError({ mensaje: resultado.mensaje, conflicto: true });
      } else {
        setError({ mensaje: `No se pudo guardar: ${resultado.mensaje}`, conflicto: false });
      }
    });
  }

  function recargar() {
    if (!window.confirm("Se perderá lo que has escrito y se cargará el guion nuevo. ¿Recargar?")) {
      return;
    }
    router.refresh();
    alCancelar();
  }

  return (
    <div className="grid gap-4">
      <div className="sticky top-0 z-[1] flex flex-wrap items-center gap-2.5 bg-fondo py-2 text-sm">
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
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
