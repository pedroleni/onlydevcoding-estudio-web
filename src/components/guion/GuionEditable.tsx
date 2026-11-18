"use client";

import { useId, useRef, useState } from "react";

import { TarjetaEscena } from "@/components/TarjetaEscena";
import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { AvisoMontaje, elegirAviso } from "@/components/guion/AvisoMontaje";
import { EditorEscenaGuion } from "@/components/guion/EditorEscenaGuion";
import { EditorGanchos } from "@/components/guion/EditorGanchos";
import type {
  Escena,
  EstadoAccion,
  EstadoMontaje,
  IdAccion,
  Teleprompter,
  Trabajo,
} from "@/lib/tipos";

type Edicion = { tipo: "escena"; id: string } | { tipo: "ganchos" } | null;

// Mientras corre una de estas, el guion no se edita: el trabajo ya lo leyó al empezar y
// dejaría el montaje (o los shorts, o la propuesta de tomas) «al día» sin la edición. La API
// también bloquea la edición de los textos mientras se identifican las tomas.
const ACCIONES_QUE_LEEN_EL_GUION: readonly IdAccion[] = [
  "alinear-voz",
  "preparar-montaje",
  "preparar-shorts",
  "identificar-tomas",
];
const CLAVE_GANCHOS = "ganchos";

const BOTON_EDITAR =
  "min-h-10 border border-borde px-4 text-sm font-semibold text-texto transition-colors hover:border-marca hover:bg-carbon disabled:cursor-not-allowed disabled:opacity-60";

// Sigue sin pintar nada un trabajo que bloquea la edición y no tiene botón en esta pestaña,
// para refrescar la página (y desbloquear) cuando acabe.
function SeguimientoOculto({ trabajo }: { trabajo: Trabajo }) {
  useSeguimientoTrabajo({ trabajo });
  return null;
}

export function GuionEditable({
  curso,
  numero,
  escenas,
  previa,
  teleprompter: teleprompterRecibido,
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
  const idBloqueo = useId();
  const [edicion, setEdicion] = useState<Edicion>(null);
  // Acción lanzada desde el aviso en esta visita y el trabajo que sigue su botón.
  const [lanzada, setLanzada] = useState<IdAccion | null>(null);
  const [trabajoAviso, setTrabajoAviso] = useState<{
    accion: IdAccion;
    trabajo: Trabajo | null;
  } | null>(null);
  // Lo devuelto al guardar, válido mientras los datos de la página sigan siendo los de antes.
  const [guardado, setGuardado] = useState<{
    antes: string;
    teleprompter: Teleprompter;
  } | null>(null);
  const volverA = useRef<string | null>(null);

  const teleprompter =
    teleprompterRecibido && guardado?.antes === teleprompterRecibido.version
      ? guardado.teleprompter
      : teleprompterRecibido;
  const editables = new Map(
    teleprompter?.escenas.map((escena) => [escena.id, escena]) ?? [],
  );

  const aviso = elegirAviso(montaje, acciones, lanzada);
  const idDelAviso = aviso?.accion?.id ?? null;
  const enMarcha = (acciones ?? []).flatMap((accion) => {
    if (!ACCIONES_QUE_LEEN_EL_GUION.includes(accion.id)) return [];
    // El botón del aviso sabe antes que los datos de la página si su trabajo empezó o acabó.
    const trabajo =
      accion.id === idDelAviso && trabajoAviso?.accion === accion.id
        ? trabajoAviso.trabajo
        : accion.ultimo;
    return trabajo?.estado === "en_marcha" ? [{ accion, trabajo }] : [];
  });
  const bloqueo = enMarcha[0]
    ? `Espera a que termine: ${enMarcha[0].accion.etiqueta} en marcha.`
    : null;
  const sinBotonEnPestana = enMarcha.filter(({ accion }) => accion.id !== idDelAviso);

  function abrir(nueva: Exclude<Edicion, null>) {
    volverA.current = null;
    setEdicion(nueva);
  }

  function cerrar() {
    volverA.current = edicion?.tipo === "escena" ? edicion.id : CLAVE_GANCHOS;
    setEdicion(null);
  }

  function guardadoCon(nuevo: Teleprompter) {
    if (teleprompterRecibido) {
      setGuardado({ antes: teleprompterRecibido.version, teleprompter: nuevo });
    }
    cerrar();
  }

  // Al cerrar un editor, el foco vuelve a su «Editar», que se monta de nuevo.
  const enfocarAlVolver = (clave: string) => (boton: HTMLButtonElement | null) => {
    if (boton && volverA.current === clave) {
      volverA.current = null;
      boton.focus();
    }
  };

  return (
    <div role="tabpanel" className="grid gap-4">
      <AvisoMontaje
        curso={curso}
        numero={numero}
        montaje={montaje}
        acciones={acciones}
        lanzada={lanzada}
        alLanzar={(accion, trabajo) => {
          setLanzada(accion);
          setTrabajoAviso({ accion, trabajo });
        }}
        alCambiarTrabajo={(accion, trabajo) => setTrabajoAviso({ accion, trabajo })}
      />
      {sinBotonEnPestana.map(({ trabajo }) => (
        <SeguimientoOculto key={trabajo.id} trabajo={trabajo} />
      ))}

      {bloqueo && edicion === null ? (
        <p id={idBloqueo} className="text-sm text-ambar">{bloqueo}</p>
      ) : null}

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
                    ref={enfocarAlVolver(escena.id)}
                    type="button"
                    className={BOTON_EDITAR}
                    aria-label={`Editar ${escena.id}`}
                    aria-describedby={bloqueo && edicion === null ? idBloqueo : undefined}
                    disabled={edicion !== null || bloqueo !== null}
                    onClick={() => abrir({ tipo: "escena", id: escena.id })}
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
                  bloqueo={bloqueo}
                  alGuardado={guardadoCon}
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
                ref={enfocarAlVolver(CLAVE_GANCHOS)}
                type="button"
                className={BOTON_EDITAR}
                aria-describedby={bloqueo && edicion === null ? idBloqueo : undefined}
                disabled={edicion !== null || bloqueo !== null}
                onClick={() => abrir({ tipo: "ganchos" })}
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
                bloqueo={bloqueo}
                alGuardado={guardadoCon}
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
