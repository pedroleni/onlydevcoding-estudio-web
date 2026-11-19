"use client";

import { useEffect, useRef, useState } from "react";

type EstadoCopia = "normal" | "copiado" | "error";

const ETIQUETA_ESTADO: Record<EstadoCopia, string> = {
  normal: "Copiar",
  copiado: "Copiado",
  error: "No se pudo copiar",
};

export function BotonCopiar({
  texto,
  contexto,
}: {
  texto: string;
  contexto?: string;
}) {
  const [estado, setEstado] = useState<EstadoCopia>("normal");
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    },
    [],
  );

  async function copiar() {
    if (temporizador.current !== null) clearTimeout(temporizador.current);
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
    } catch {
      setEstado("error");
    }
    temporizador.current = setTimeout(() => setEstado("normal"), 2000);
  }

  const etiqueta = ETIQUETA_ESTADO[estado];
  const etiquetaAccesible = contexto ? `${etiqueta} ${contexto}` : etiqueta;

  return (
    <button
      type="button"
      onClick={copiar}
      aria-label={etiquetaAccesible}
      className="min-h-9 shrink-0 border border-borde bg-carbon px-3 text-xs font-semibold text-tenue transition-colors hover:border-marca hover:text-texto active:translate-y-px"
    >
      {etiqueta}
    </button>
  );
}
