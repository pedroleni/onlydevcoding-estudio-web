"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ErrorEditorGuionDatos } from "@/components/guion/ErrorEditorGuion";
import {
  guardarTextos,
  type TextoGancho,
  type TextosEscena,
} from "@/lib/acciones-teleprompter";
import type { Teleprompter } from "@/lib/tipos";

// Guardado común de los editores del guion: se guarda contra la versión que había al abrir
// el editor y, si otro cambio llegó antes, se ofrece recargar sin perder lo escrito.
export function useGuardarTextosGuion({
  curso,
  numero,
  version,
  alGuardado,
  refrescarAlGuardar = true,
}: {
  curso: string;
  numero: number;
  version: string;
  alGuardado: (teleprompter: Teleprompter) => void;
  refrescarAlGuardar?: boolean;
}) {
  const router = useRouter();
  const [versionBase] = useState(version);
  const [error, setError] = useState<ErrorEditorGuionDatos | null>(null);
  // Tras «Recargar», hasta que llega el guion nuevo no se puede guardar con la versión vieja.
  const [recargando, setRecargando] = useState(false);
  const [guardando, iniciar] = useTransition();
  const llegoNuevo = recargando && version !== versionBase;

  function guardar(escenas: TextosEscena[], ganchos?: TextoGancho[]) {
    setError(null);
    iniciar(async () => {
      const resultado = await guardarTextos({
        curso,
        numero,
        version: versionBase,
        escenas,
        ...(ganchos ? { ganchos } : {}),
      });
      if (resultado.ok) {
        alGuardado(resultado.teleprompter);
        if (refrescarAlGuardar) router.refresh();
      } else if (resultado.conflicto) {
        setError({ mensaje: resultado.mensaje, conflicto: true });
      } else {
        setError({ mensaje: `No se pudo guardar: ${resultado.mensaje}`, conflicto: false });
      }
    });
  }

  // Pide el guion nuevo sin cerrar el editor: al llegar solo se puede descartar lo escrito.
  function recargar() {
    setError(null);
    setRecargando(true);
    router.refresh();
  }

  // Lo que necesita el pie del editor (PieEditorGuion), listo para esparcir.
  const pie = { guardando, recargando, llegoNuevo, error, alRecargar: recargar };

  return { error, setError, recargando, guardando, llegoNuevo, guardar, recargar, pie };
}
