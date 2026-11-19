"use client";

import { useId, useRef, useState } from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { AvisoMontaje, elegirAviso } from "@/components/guion/AvisoMontaje";
import {
  EscenasEditables,
  SeccionGanchos,
  type EdicionGuion,
} from "@/components/guion/ContenidoGuionEditable";
import type {
  Escena,
  EstadoAccion,
  EstadoMontaje,
  IdAccion,
  Teleprompter,
  Trabajo,
} from "@/lib/tipos";

// Mientras corre una de estas, el guion no se edita: el trabajo ya lo leyó al empezar y
// dejaría el montaje (o los shorts, o la propuesta de tomas) «al día» sin la edición. La API
// también bloquea la edición de los textos mientras se identifican las tomas.
const ACCIONES_QUE_LEEN_EL_GUION: readonly IdAccion[] = [
  "alinear-voz",
  "preparar-montaje",
  "preparar-shorts",
  "identificar-tomas",
];

// Sigue sin pintar nada un trabajo que bloquea la edición y no tiene botón en esta pestaña,
// para refrescar la página (y desbloquear) cuando acabe.
function SeguimientoOculto({ trabajo }: { trabajo: Trabajo }) {
  useSeguimientoTrabajo({ trabajo });
  return null;
}

function trabajosEnMarcha(
  acciones: EstadoAccion[] | null,
  idDelAviso: IdAccion | null,
  trabajoAviso: { accion: IdAccion; trabajo: Trabajo | null } | null,
) {
  return (acciones ?? []).flatMap((accion) => {
    if (!ACCIONES_QUE_LEEN_EL_GUION.includes(accion.id)) return [];
    // El botón del aviso sabe antes que los datos de la página si su trabajo empezó o acabó.
    const trabajo =
      accion.id === idDelAviso && trabajoAviso?.accion === accion.id
        ? trabajoAviso.trabajo
        : accion.ultimo;
    return trabajo?.estado === "en_marcha" ? [{ accion, trabajo }] : [];
  });
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
  const [edicion, setEdicion] = useState<EdicionGuion>(null);
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
  const aviso = elegirAviso(montaje, acciones, lanzada);
  const idDelAviso = aviso?.accion?.id ?? null;
  const enMarcha = trabajosEnMarcha(acciones, idDelAviso, trabajoAviso);
  const bloqueo = enMarcha[0]
    ? `Espera a que termine: ${enMarcha[0].accion.etiqueta} en marcha.`
    : null;
  const sinBotonEnPestana = enMarcha.filter(({ accion }) => accion.id !== idDelAviso);

  function abrir(nueva: Exclude<EdicionGuion, null>) {
    volverA.current = null;
    setEdicion(nueva);
  }

  function cerrar() {
    volverA.current = edicion?.tipo === "escena" ? edicion.id : "ganchos";
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
      {bloqueo && edicion === null ? <p id={idBloqueo} className="text-sm text-ambar">{bloqueo}</p> : null}
      <EscenasEditables
        curso={curso}
        numero={numero}
        escenas={escenas}
        previa={previa}
        teleprompter={teleprompter}
        edicion={edicion}
        bloqueo={bloqueo}
        idBloqueo={idBloqueo}
        abrir={abrir}
        cerrar={cerrar}
        alGuardado={guardadoCon}
        enfocarAlVolver={enfocarAlVolver}
      />
      {teleprompter ? (
          <SeccionGanchos
            curso={curso}
            numero={numero}
            teleprompter={teleprompter}
            edicion={edicion}
            bloqueo={bloqueo}
            idBloqueo={idBloqueo}
            abrir={abrir}
            cerrar={cerrar}
            alGuardado={guardadoCon}
            enfocarAlVolver={enfocarAlVolver}
          />
      ) : null}
    </div>
  );
}
