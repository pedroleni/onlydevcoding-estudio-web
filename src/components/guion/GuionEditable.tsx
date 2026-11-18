"use client";

import { useState } from "react";

import { TarjetaEscena } from "@/components/TarjetaEscena";
import { AvisoMontaje } from "@/components/guion/AvisoMontaje";
import { EditorEscenaGuion } from "@/components/guion/EditorEscenaGuion";
import { EditorGanchos } from "@/components/guion/EditorGanchos";
import type {
  Escena,
  EstadoAccion,
  EstadoMontaje,
  Teleprompter,
} from "@/lib/tipos";

type Edicion = { tipo: "escena"; id: string } | { tipo: "ganchos" } | null;

const BOTON_EDITAR =
  "min-h-10 border border-borde px-4 text-sm font-semibold text-texto transition-colors hover:border-marca hover:bg-carbon disabled:cursor-not-allowed disabled:opacity-60";

export function GuionEditable({
  curso,
  numero,
  escenas,
  previa,
  teleprompter,
  montaje,
  acciones,
}: {
  curso: string;
  numero: number;
  escenas: Escena[];
  previa: string | null;
  teleprompter: Teleprompter | null;
  montaje: EstadoMontaje | null;
  acciones: EstadoAccion[] | null;
}) {
  const [edicion, setEdicion] = useState<Edicion>(null);
  const editables = new Map(
    teleprompter?.escenas.map((escena) => [escena.id, escena]) ?? [],
  );
  const cerrar = () => setEdicion(null);

  return (
    <div role="tabpanel" className="grid gap-4">
      <AvisoMontaje
        curso={curso}
        numero={numero}
        montaje={montaje}
        acciones={acciones}
      />

      {escenas.length > 0 ? (
        escenas.map((escena) => {
          const editable = editables.get(escena.id);
          const editando = edicion?.tipo === "escena" && edicion.id === escena.id;
          return (
            <div key={escena.id} className="grid gap-3">
              <TarjetaEscena
                escena={escena}
                previa={previa}
                acciones={editable && !editando ? (
                  <button
                    type="button"
                    className={BOTON_EDITAR}
                    disabled={edicion !== null}
                    onClick={() => setEdicion({ tipo: "escena", id: escena.id })}
                  >
                    Editar
                  </button>
                ) : undefined}
              />
              {editable && editando && teleprompter ? (
                <EditorEscenaGuion
                  curso={curso}
                  numero={numero}
                  version={teleprompter.version}
                  escena={editable}
                  alGuardado={cerrar}
                  alCancelar={cerrar}
                />
              ) : null}
            </div>
          );
        })
      ) : (
        <p className="border border-borde bg-superficie p-6 text-tenue">
          Esta lección todavía no tiene escenas.
        </p>
      )}

      {teleprompter ? (
        <section className="mt-4 border-t border-borde pt-6" aria-labelledby="titulo-ganchos">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="titulo-ganchos" className="text-xl font-semibold">Ganchos de los shorts</h2>
            {teleprompter.ganchos.length > 0 && edicion?.tipo !== "ganchos" ? (
              <button
                type="button"
                className={BOTON_EDITAR}
                disabled={edicion !== null}
                onClick={() => setEdicion({ tipo: "ganchos" })}
              >
                Editar ganchos
              </button>
            ) : null}
          </div>

          {edicion?.tipo === "ganchos" && teleprompter.ganchos.length > 0 ? (
            <div className="mt-4">
              <EditorGanchos
                curso={curso}
                numero={numero}
                version={teleprompter.version}
                ganchos={teleprompter.ganchos}
                alGuardado={cerrar}
                alCancelar={cerrar}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {teleprompter.ganchos.map((gancho) => (
                <article key={gancho.id} className="border border-borde bg-superficie p-5">
                  <h3 className="font-semibold">{gancho.titulo}</h3>
                  <p className="mt-2 text-sm leading-6 text-tenue">{gancho.texto}</p>
                </article>
              ))}
              {teleprompter.ganchos.length === 0 ? (
                <p className="text-sm text-tenue">Este guion no tiene ganchos.</p>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
