"use client";

import { useEffect, useRef, useState } from "react";

export function BotonCopiar({ texto }: { texto: string }) {
  const [estado, setEstado] = useState<"normal" | "copiado" | "error">(
    "normal",
  );
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    },
    [],
  );

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setEstado("copiado");
      if (temporizador.current !== null) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => setEstado("normal"), 2000);
    } catch {
      setEstado("error");
    }
  }

  const etiqueta =
    estado === "copiado"
      ? "Copiado"
      : estado === "error"
        ? "No se pudo copiar"
        : "Copiar";

  return (
    <button
      type="button"
      onClick={copiar}
      className="min-h-9 shrink-0 border border-borde bg-carbon px-3 text-xs font-semibold text-tenue transition-colors hover:border-marca hover:text-texto active:translate-y-px"
    >
      {etiqueta}
    </button>
  );
}
