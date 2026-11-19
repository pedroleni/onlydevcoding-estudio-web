"use client";

import { useId } from "react";

import {
  ErrorEditorGuion,
  type ErrorEditorGuionDatos,
} from "@/components/guion/ErrorEditorGuion";

const CAMPO =
  "field-sizing-content mt-2 min-h-11 w-full resize-none border border-borde bg-carbon px-3 py-2 text-sm leading-6 text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-60";
const BOTON_SECUNDARIO =
  "min-h-11 border border-borde px-5 text-sm font-semibold text-tenue transition-colors hover:border-texto hover:text-texto disabled:cursor-wait disabled:opacity-60";
const BOTON_PRINCIPAL =
  "min-h-11 bg-marca px-5 text-sm font-bold text-fondo transition-colors hover:bg-texto disabled:cursor-not-allowed disabled:opacity-60";

// Un texto del guion: una sola línea aunque ocupe varias en pantalla (Enter no hace nada).
export function CampoGuion({
  etiqueta,
  nombreAccesible,
  valor,
  guardando,
  recargando,
  alCambiar,
}: {
  etiqueta: string;
  nombreAccesible: string;
  valor: string;
  guardando: boolean;
  recargando: boolean;
  alCambiar: (valor: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {etiqueta}
      <textarea
        aria-label={nombreAccesible}
        rows={2}
        value={valor}
        disabled={guardando}
        readOnly={recargando}
        onChange={(evento) => alCambiar(evento.target.value)}
        onKeyDown={(evento) => {
          if (evento.key === "Enter") evento.preventDefault();
        }}
        className={CAMPO}
      />
    </label>
  );
}

// Botones y avisos al pie de un editor del guion.
export function PieEditorGuion({
  puedeGuardar,
  guardando,
  recargando,
  llegoNuevo,
  bloqueo,
  error,
  alGuardar,
  alCancelar,
  alRecargar,
}: {
  puedeGuardar: boolean;
  guardando: boolean;
  recargando: boolean;
  llegoNuevo: boolean;
  bloqueo: string | null;
  error: ErrorEditorGuionDatos | null;
  alGuardar: () => void;
  alCancelar: () => void;
  alRecargar: () => void;
}) {
  const idBloqueo = useId();
  return (
    <>
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-borde pt-5">
        <button type="button" disabled={guardando} onClick={alCancelar} className={BOTON_SECUNDARIO}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || recargando || Boolean(bloqueo) || !puedeGuardar}
          aria-describedby={bloqueo ? idBloqueo : undefined}
          onClick={alGuardar}
          className={BOTON_PRINCIPAL}
        >
          Guardar
        </button>
      </div>

      {bloqueo ? <p id={idBloqueo} className="mt-3 text-sm text-ambar">{bloqueo}</p> : null}
      {recargando && !llegoNuevo ? <p role="status" className="mt-3 text-sm text-tenue">Cargando el guion nuevo…</p> : null}
      {llegoNuevo ? (
        <p role="alert" className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-ambar">
          Ha llegado el guion nuevo. ¿Descartas lo que has escrito?
          <button type="button" onClick={alCancelar} className="border border-ambar px-3 py-1.5 font-semibold text-ambar">
            Descartar lo escrito
          </button>
        </p>
      ) : null}
      <ErrorEditorGuion error={error} alRecargar={alRecargar} />
    </>
  );
}
