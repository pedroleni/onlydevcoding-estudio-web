"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import { guardarTextos, type TextosEscena } from "@/lib/acciones-teleprompter";
import { limpio, sinSaltos, valido } from "@/lib/textos-guion";
import type { EscenaTeleprompter } from "@/lib/tipos";

const CAMPO =
  "field-sizing-content mt-2 min-h-11 w-full resize-none border border-borde bg-carbon px-3 py-2 text-sm leading-6 text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-60";
const BOTON_SECUNDARIO =
  "min-h-11 border border-borde px-5 text-sm font-semibold text-tenue transition-colors hover:border-texto hover:text-texto disabled:cursor-wait disabled:opacity-60";
const BOTON_PRINCIPAL =
  "min-h-11 bg-marca px-5 text-sm font-bold text-fondo transition-colors hover:bg-texto disabled:cursor-not-allowed disabled:opacity-60";

export function EditorEscenaGuion({
  curso,
  numero,
  version,
  escena,
  alGuardado,
  alCancelar,
}: {
  curso: string;
  numero: number;
  version: string;
  escena: EscenaTeleprompter;
  alGuardado: () => void;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const [base] = useState(() => ({
    version,
    cues: escena.cues.map(({ texto }) => texto),
    puntos: [...escena.puntos],
  }));
  const [cues, setCues] = useState(base.cues);
  const [puntos, setPuntos] = useState(base.puntos);
  const [error, setError] = useState<{ mensaje: string; conflicto: boolean } | null>(null);
  const [recargando, setRecargando] = useState(false);
  const [guardando, iniciar] = useTransition();
  const llegoNuevo = recargando && version !== base.version;
  const cambioCues = cues.some((texto, indice) => texto !== base.cues[indice]);
  const cambioPuntos = puntos.some((texto, indice) => texto !== base.puntos[indice]);
  const sinGuardar = cambioCues || cambioPuntos;
  const textosValidos = [...cues, ...puntos].every(valido);

  useAvisoAlSalir(sinGuardar);

  function cambiar(
    actualiza: typeof setCues,
    indice: number,
    valor: string,
  ) {
    actualiza((actuales) =>
      actuales.map((texto, posicion) =>
        posicion === indice ? sinSaltos(valor) : texto,
      ),
    );
  }

  function guardar() {
    if (recargando || !sinGuardar || !textosValidos) return;
    const cuesLimpios = cues.map(limpio);
    const puntosLimpios = puntos.map(limpio);
    const cambio: TextosEscena = escena.modo === "voz"
      ? { id: escena.id, cues: cuesLimpios }
      : {
          id: escena.id,
          ...(cuesLimpios.length === 0 ? {} : { cues: cuesLimpios }),
          ...(puntosLimpios.length === 0 ? {} : { puntos: puntosLimpios }),
        };

    setError(null);
    iniciar(async () => {
      const resultado = await guardarTextos(curso, numero, base.version, [cambio]);
      if (resultado.ok) {
        alGuardado();
        router.refresh();
      } else if (resultado.conflicto) {
        setError({ mensaje: resultado.mensaje, conflicto: true });
      } else {
        setError({ mensaje: `No se pudo guardar: ${resultado.mensaje}`, conflicto: false });
      }
    });
  }

  function recargar() {
    setError(null);
    setRecargando(true);
    router.refresh();
  }

  function campo(
    etiqueta: "Frase" | "Punto",
    textos: string[],
    actualiza: typeof setCues,
  ) {
    return textos.map((texto, indice) => (
      <label key={`${etiqueta}-${indice}`} className="block text-sm font-medium">
        {etiqueta} {indice + 1}
        <textarea
          aria-label={`${etiqueta} ${indice + 1}`}
          rows={2}
          value={texto}
          disabled={guardando}
          readOnly={recargando}
          onChange={(evento) => cambiar(actualiza, indice, evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") evento.preventDefault();
          }}
          className={CAMPO}
        />
      </label>
    ));
  }

  return (
    <section className="border border-borde bg-superficie p-5" aria-label={`Editar ${escena.id}`}>
      <h4 className="text-lg font-semibold">Editar textos de {escena.id}</h4>
      <div className="mt-5 grid gap-5">
        {campo("Frase", cues, setCues)}
        {escena.modo === "camara" ? campo("Punto", puntos, setPuntos) : null}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-borde pt-5">
        <button type="button" disabled={guardando} onClick={alCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || recargando || !sinGuardar || !textosValidos}
          onClick={guardar}
          className={BOTON_PRINCIPAL}
        >
          Guardar
        </button>
      </div>

      {recargando && !llegoNuevo ? <p role="status" className="mt-3 text-sm text-tenue">Cargando el guion nuevo…</p> : null}
      {llegoNuevo ? (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-ambar">
          Ha llegado el guion nuevo. ¿Descartas lo que has escrito?
          <button type="button" onClick={alCancelar} className="border border-ambar px-3 py-1.5 font-semibold text-ambar">
            Descartar lo escrito
          </button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-ambar">
          {error.mensaje}
          {error.conflicto ? (
            <button type="button" onClick={recargar} className="border border-ambar px-3 py-1.5 font-semibold text-ambar">
              Recargar
            </button>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
