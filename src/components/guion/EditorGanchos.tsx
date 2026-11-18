"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import { limpio, sinSaltos, valido } from "@/lib/textos-guion";
import type { Teleprompter } from "@/lib/tipos";

type Gancho = Teleprompter["ganchos"][number];

const CAMPO =
  "field-sizing-content mt-2 min-h-11 w-full resize-none border border-borde bg-carbon px-3 py-2 text-sm leading-6 text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-60";

export function EditorGanchos({
  curso,
  numero,
  version,
  ganchos,
  alGuardado,
  alCancelar,
}: {
  curso: string;
  numero: number;
  version: string;
  ganchos: Gancho[];
  alGuardado: () => void;
  alCancelar: () => void;
}) {
  const router = useRouter();
  const [base] = useState(() => ({ version, textos: ganchos.map(({ texto }) => texto) }));
  const [textos, setTextos] = useState(base.textos);
  const [error, setError] = useState<{ mensaje: string; conflicto: boolean } | null>(null);
  const [recargando, setRecargando] = useState(false);
  const [guardando, iniciar] = useTransition();
  const llegoNuevo = recargando && version !== base.version;
  const sinGuardar = textos.some((texto, indice) => texto !== base.textos[indice]);
  const textosValidos = textos.every(valido);

  useAvisoAlSalir(sinGuardar);

  function cambiar(indice: number, valor: string) {
    setTextos((actuales) =>
      actuales.map((texto, posicion) =>
        posicion === indice ? sinSaltos(valor) : texto,
      ),
    );
  }

  function guardar() {
    if (recargando || !sinGuardar || !textosValidos) return;
    const paraGuardar = ganchos.map(({ id }, indice) => ({
      id,
      texto: limpio(textos[indice]),
    }));
    setError(null);
    iniciar(async () => {
      const resultado = await guardarTextos(curso, numero, base.version, [], paraGuardar);
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

  return (
    <section className="border border-borde bg-superficie p-5" aria-label="Editar ganchos">
      <h3 className="text-lg font-semibold">Editar ganchos</h3>
      <div className="mt-5 grid gap-5">
        {ganchos.map((gancho, indice) => (
          <label key={gancho.id} className="block text-sm font-medium">
            {gancho.titulo}
            <textarea
              aria-label={`Texto de ${gancho.titulo}`}
              rows={2}
              value={textos[indice]}
              disabled={guardando}
              readOnly={recargando}
              onChange={(evento) => cambiar(indice, evento.target.value)}
              onKeyDown={(evento) => {
                if (evento.key === "Enter") evento.preventDefault();
              }}
              className={CAMPO}
            />
          </label>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-borde pt-5">
        <button
          type="button"
          disabled={guardando}
          onClick={alCancelar}
          className="min-h-11 border border-borde px-5 text-sm font-semibold text-tenue transition-colors hover:border-texto hover:text-texto disabled:cursor-wait disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={guardando || recargando || !sinGuardar || !textosValidos}
          onClick={guardar}
          className="min-h-11 bg-marca px-5 text-sm font-bold text-fondo transition-colors hover:bg-texto disabled:cursor-not-allowed disabled:opacity-60"
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
