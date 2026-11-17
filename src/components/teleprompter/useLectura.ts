"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import { mmss, type Plan } from "@/lib/teleprompter/ritmo";

export type Aviso = { texto: string; sub: string };
export type Cuenta = [texto: string, sub: string, ms: number];

// Lo que devuelve `empezar`: `sigue()` dice si esta ejecución sigue viva (no se ha parado ni
// se ha arrancado otra) y `vigente()` si sigue siendo la última, aunque ya no esté en marcha.
export type Ejecucion = { sigue: () => boolean; vigente: () => boolean };

export type OpcionesAnimacion = {
  // Margen tras el texto antes de terminar solo (grabando, la toma sigue un rato).
  margen: () => number;
  alFotograma?: (t: number) => void;
  alTerminar: () => void;
};

export function ponerTexto(elemento: HTMLElement | null, texto: string) {
  if (!elemento) return;
  if (elemento.firstChild) elemento.firstChild.nodeValue = texto;
  else elemento.textContent = texto;
}

// Todo lo que cambia en cada fotograma vive fuera del estado de React.
type Vivo = {
  cerrado: boolean;
  enMarcha: boolean;
  ejecucion: number;
  animacion: number;
  espera: { temporizador: ReturnType<typeof setTimeout>; soltar: () => void } | null;
  elementos: Array<HTMLElement | null>;
  inicio: number;
  ultimaLinea: number;
  reloj: ReturnType<typeof setInterval> | undefined;
  relojInicio: number;
};

const crearVivo = (): Vivo => ({
  cerrado: false,
  enMarcha: false,
  ejecucion: 0,
  animacion: 0,
  espera: null,
  elementos: [],
  inicio: 0,
  ultimaLinea: -1,
  reloj: undefined,
  relojInicio: 0,
});

// Espera de la cuenta atrás que se puede cortar: al parar o al desmontar no queda ningún temporizador.
function esperar(v: Vivo, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const temporizador = setTimeout(() => {
      v.espera = null;
      resolve();
    }, ms);
    v.espera = { temporizador, soltar: resolve };
  });
}

function cortarEspera(v: Vivo) {
  const espera = v.espera;
  if (!espera) return;
  v.espera = null;
  clearTimeout(espera.temporizador);
  espera.soltar();
}

// Mantiene la palabra que toca al 35 % de la altura del teleprompter.
function mantenerALaVista(v: Vivo, caja: HTMLElement, elemento: HTMLElement) {
  const y = elemento.offsetTop - caja.clientHeight * 0.35;
  if (Math.abs(y - v.ultimaLinea) > 10) {
    v.ultimaLinea = y;
    caja.scrollTo?.({ top: y });
  }
}

// Ilumina el texto al ritmo del plan con requestAnimationFrame, cambiando clases en el DOM
// sin pasar por el estado de React.
function animarTexto(v: Vivo, caja: HTMLElement | null, plan: Plan, opciones: OpcionesAnimacion) {
  if (!caja) return;
  v.elementos = plan.pasos.map((paso) =>
    caja.querySelector<HTMLElement>(
      paso.pausa ? `[data-pausa="${paso.c}"] i` : `.p[data-c="${paso.c}"][data-p="${paso.p}"]`,
    ),
  );
  v.inicio = performance.now();

  const fotograma = () => {
    const t = (performance.now() - v.inicio) / 1000;
    let actual: HTMLElement | null = null;

    plan.pasos.forEach((paso, i) => {
      const elemento = v.elementos[i];
      if (!elemento) return;
      if (paso.pausa) {
        const avance = Math.max(0, Math.min(1, (t - paso.desde) / (paso.hasta - paso.desde)));
        elemento.style.width = `${avance * 100}%`;
        return;
      }
      elemento.classList.toggle("dicha", t >= paso.hasta);
      const ahora = t >= paso.desde && t < paso.hasta;
      elemento.classList.toggle("ahora", ahora);
      if (ahora) actual = elemento;
    });

    if (actual) mantenerALaVista(v, caja, actual);
    opciones.alFotograma?.(t);
    // Grabando, el texto puede acabar antes que tú: la toma sigue hasta que pulses Parar (con un tope por si se te olvida).
    if (t > plan.total + opciones.margen()) {
      opciones.alTerminar();
      return;
    }
    v.animacion = requestAnimationFrame(fotograma);
  };
  fotograma();
}

function arrancarReloj(v: Vivo, reloj: HTMLElement | null) {
  v.relojInicio = performance.now();
  clearInterval(v.reloj);
  v.reloj = setInterval(
    () => ponerTexto(reloj, mmss((performance.now() - v.relojInicio) / 1000)),
    250,
  );
}

// La lectura del teleprompter: cuenta atrás, reloj y texto iluminado al ritmo.
export function useLectura({
  prompterRef,
  relojRef,
}: {
  prompterRef: RefObject<HTMLElement | null>;
  relojRef: RefObject<HTMLElement | null>;
}) {
  const [enMarcha, setEnMarcha] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const vivoRef = useRef<Vivo | null>(null);
  // Se crea la primera vez que hace falta, nunca durante el render.
  const vivo = (): Vivo => (vivoRef.current ??= crearVivo());

  useEffect(() => {
    const v = vivo();
    v.cerrado = false;
    return () => {
      v.cerrado = true;
      v.enMarcha = false;
      v.ejecucion++;
      cortarEspera(v);
      cancelAnimationFrame(v.animacion);
      clearInterval(v.reloj);
    };
  }, []);

  // Pone en marcha una ejecución nueva (y el reloj). Devuelve null si ya hay una o se ha cerrado.
  function empezar(): Ejecucion | null {
    const v = vivo();
    if (v.enMarcha || v.cerrado) return null;
    const ejecucion = ++v.ejecucion;
    v.enMarcha = true;
    setEnMarcha(true);
    arrancarReloj(v, relojRef.current);
    return {
      sigue: () => v.enMarcha && v.ejecucion === ejecucion,
      vigente: () => v.ejecucion === ejecucion,
    };
  }

  function detener() {
    const v = vivo();
    v.enMarcha = false;
    v.ejecucion++;
    cortarEspera(v);
    cancelAnimationFrame(v.animacion);
    clearInterval(v.reloj);
    v.ultimaLinea = -1;
    setAviso(null);
  }

  function limpiarTexto() {
    prompterRef.current
      ?.querySelectorAll(".p")
      .forEach((elemento) => elemento.classList.remove("dicha", "ahora"));
    prompterRef.current
      ?.querySelectorAll<HTMLElement>("[data-pausa] i")
      .forEach((barra) => barra.style.removeProperty("width"));
  }

  function pararTodo(limpiar: boolean) {
    detener();
    setEnMarcha(false);
    if (limpiar) limpiarTexto();
  }

  async function cuentaAtras(textos: Cuenta[], sigue: () => boolean) {
    for (const [texto, sub, ms] of textos) {
      setAviso({ texto, sub });
      await esperar(vivo(), ms);
      if (!sigue()) return;
    }
    setAviso(null);
  }

  function animar(plan: Plan, opciones: OpcionesAnimacion) {
    animarTexto(vivo(), prompterRef.current, plan, opciones);
  }

  return {
    enMarcha,
    aviso,
    empezar,
    detener,
    pararTodo,
    cuentaAtras,
    animar,
    enMarchaAhora: () => vivo().enMarcha,
    cerrada: () => vivo().cerrado,
  };
}
