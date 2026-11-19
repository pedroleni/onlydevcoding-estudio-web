"use client";

import { useEffect } from "react";

export interface ReelPlano {
  clave: string;
  numero: number;
  tituloLeccion: string;
  id: string;
  titulo: string;
  texto: string;
  grabado: boolean;
  entregado: boolean;
}

export function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}

// El reel a pantalla completa para leerlo de lejos: flechas para moverse y Escape para cerrar.
export function PantallaReel({
  secuencia,
  posicion,
  grabados,
  pendiente,
  onMover,
  onGrabado,
  onCerrar,
}: {
  secuencia: ReelPlano[];
  posicion: number;
  grabados: Set<string>;
  pendiente: boolean;
  onMover: (delta: number) => void;
  onGrabado: (reel: ReelPlano) => void;
  onCerrar: () => void;
}) {
  const reel = secuencia[posicion];
  const grabado = reel ? grabados.has(reel.clave) : false;

  useEffect(() => {
    function tecla(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
      if (evento.key === "ArrowRight") onMover(1);
      if (evento.key === "ArrowLeft") onMover(-1);
    }
    window.addEventListener("keydown", tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", tecla);
      document.body.style.overflow = anterior;
    };
  }, [onCerrar, onMover]);

  if (!reel) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Reel en grande"
      className="fixed inset-0 z-50 flex flex-col bg-fondo px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="flex items-center justify-between gap-3 text-sm text-tenue">
        <span className="min-w-0 truncate">
          <span className="font-mono text-marca">L{dosCifras(reel.numero)}</span> · {reel.id} ·{" "}
          {reel.titulo}
        </span>
        <span className="shrink-0 font-mono">
          {posicion + 1}/{secuencia.length}
        </span>
      </div>
      <div className="grid flex-1 place-items-center overflow-y-auto py-6">
        <p
          key={reel.clave}
          className="entrar max-w-4xl text-center text-[clamp(2rem,7.5vw,5.5rem)] font-semibold leading-[1.15] tracking-[-0.02em]"
        >
          {reel.texto}
        </p>
      </div>
      {grabado ? (
        <p className="mb-2 text-center text-sm text-verde">✓ Grabado</p>
      ) : null}
      <div className="grid grid-cols-[1fr_1.4fr_1fr] gap-2">
        <button
          type="button"
          onClick={() => onMover(-1)}
          disabled={posicion === 0}
          className="min-h-14 rounded-2xl border border-borde text-sm font-medium disabled:opacity-40"
        >
          ← Anterior
        </button>
        <button
          type="button"
          onClick={() => onGrabado(reel)}
          disabled={pendiente}
          aria-pressed={grabado}
          className={`min-h-14 rounded-2xl text-base font-bold transition-colors disabled:cursor-wait ${
            grabado ? "border border-verde text-verde" : "bg-verde text-fondo"
          }`}
        >
          {grabado ? "✓ Ya grabado" : "Grabado ✓"}
        </button>
        <button
          type="button"
          onClick={() => onMover(1)}
          disabled={posicion === secuencia.length - 1}
          className="min-h-14 rounded-2xl border border-borde text-sm font-medium disabled:opacity-40"
        >
          Siguiente →
        </button>
      </div>
      <button
        type="button"
        onClick={onCerrar}
        className="mt-2 min-h-11 text-sm text-tenue hover:text-texto"
      >
        Cerrar
      </button>
    </div>
  );
}
