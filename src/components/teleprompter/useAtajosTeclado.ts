"use client";

import { useEffect, useEffectEvent } from "react";

import { mostrarEscena } from "@/components/teleprompter/accionesEscena";
import { arrancar, parar, repetir } from "@/components/teleprompter/arranqueLectura";
import type { ContextoSesion } from "@/components/teleprompter/contextoSesion";

type Accion = "parar" | "ensayar" | "grabar" | "repetir" | "siguiente" | "anterior";
// `prevenir`: si la tecla deja de hacer lo suyo en el navegador (Espacio desplaza la página).
type Atajo = { accion: Accion; prevenir: boolean };

const ACCIONES: Record<Accion, (ctx: ContextoSesion) => void> = {
  parar: (ctx) => void parar(ctx),
  ensayar: (ctx) => void arrancar(ctx, false),
  grabar: (ctx) => void arrancar(ctx, true),
  repetir: (ctx) => void repetir(ctx),
  siguiente: (ctx) => mostrarEscena(ctx, ctx.indice + 1),
  anterior: (ctx) => mostrarEscena(ctx, ctx.indice - 1),
};

// Tampoco en la zona de entrega: sus botones y campos usan el teclado a su manera.
const CON_TECLADO_PROPIO = "input, select, textarea, [contenteditable], [data-sin-atajos]";

const conTecladoPropio = (destino: EventTarget | null) =>
  destino instanceof Element && destino.closest(CON_TECLADO_PROPIO) !== null;

// Las teclas se comprueban en este orden: la primera que encaja se queda la pulsación.
function atajoDe(evento: KeyboardEvent, { enMarcha, voz, ocupado }: ContextoSesion): Atajo | null {
  if (evento.code === "Space") return { accion: enMarcha ? "parar" : "ensayar", prevenir: true };
  if (evento.code === "Enter" && !enMarcha && voz) return { accion: "grabar", prevenir: true };
  if (evento.code === "Escape" && enMarcha) return { accion: "parar", prevenir: false };
  if (evento.key === "r" || evento.key === "R") {
    return enMarcha ? { accion: "repetir", prevenir: false } : null;
  }
  if (evento.code === "ArrowRight" && !ocupado) return { accion: "siguiente", prevenir: false };
  if (evento.code === "ArrowLeft" && !ocupado) return { accion: "anterior", prevenir: false };
  return null;
}

function alPulsarTecla(ctx: ContextoSesion, evento: KeyboardEvent) {
  if (ctx.editando) return;
  if (conTecladoPropio(evento.target)) return;
  if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
  const atajo = atajoDe(evento, ctx);
  if (!atajo) return;
  if (atajo.prevenir) evento.preventDefault();
  ACCIONES[atajo.accion](ctx);
}

// Atajos de teclado del teleprompter, siempre con los valores del último render.
export function useAtajosTeclado(ctx: ContextoSesion) {
  const alPulsar = useEffectEvent((evento: KeyboardEvent) => alPulsarTecla(ctx, evento));

  useEffect(() => {
    const escuchar = (evento: KeyboardEvent) => alPulsar(evento);
    document.addEventListener("keydown", escuchar);
    return () => document.removeEventListener("keydown", escuchar);
  }, []);
}
