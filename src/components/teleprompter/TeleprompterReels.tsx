"use client";

import { useCallback, useEffect, useId, useMemo, useState, useTransition } from "react";

import { marcarGanchoGrabado } from "@/lib/acciones-reels";
import type { ReelsCurso } from "@/lib/tipos";

export const TODAS = "todas";

interface ReelPlano {
  clave: string;
  numero: number;
  tituloLeccion: string;
  id: string;
  titulo: string;
  texto: string;
  grabado: boolean;
  entregado: boolean;
}

function aplanar(reels: ReelsCurso): ReelPlano[] {
  return reels.lecciones.flatMap((leccion) =>
    leccion.ganchos.map((gancho) => ({
      ...gancho,
      clave: `${leccion.numero}-${gancho.id}`,
      numero: leccion.numero,
      tituloLeccion: leccion.titulo,
    })),
  );
}

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}

function Pantalla({
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

export function TeleprompterReels({
  curso,
  reels,
  leccionInicial,
}: {
  curso: string;
  reels: ReelsCurso;
  leccionInicial: string;
}) {
  const todos = useMemo(() => aplanar(reels), [reels]);
  const [grabados, setGrabados] = useState(
    () => new Set(todos.filter((r) => r.grabado).map((r) => r.clave)),
  );
  const [leccion, setLeccion] = useState(
    reels.lecciones.some((l) => String(l.numero) === leccionInicial) ? leccionInicial : TODAS,
  );
  const [ocultar, setOcultar] = useState(true);
  const [secuencia, setSecuencia] = useState<ReelPlano[] | null>(null);
  const [posicion, setPosicion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const idLeccion = useId();
  const idOcultar = useId();

  const deLaSeleccion = todos.filter((r) => leccion === TODAS || String(r.numero) === leccion);
  const hechos = deLaSeleccion.filter((r) => grabados.has(r.clave)).length;
  const visibles = deLaSeleccion.filter((r) => !ocultar || !grabados.has(r.clave));
  const porcentaje = deLaSeleccion.length ? Math.round((hechos / deLaSeleccion.length) * 100) : 0;

  function elegirLeccion(valor: string) {
    setLeccion(valor);
    const url = new URL(window.location.href);
    url.searchParams.set("leccion", valor);
    window.history.replaceState(null, "", url);
  }

  function guardar(reel: ReelPlano, grabado: boolean) {
    setError(null);
    setGrabados((previos) => {
      const siguientes = new Set(previos);
      if (grabado) siguientes.add(reel.clave);
      else siguientes.delete(reel.clave);
      return siguientes;
    });
    iniciar(async () => {
      const resultado = await marcarGanchoGrabado(curso, reel.numero, reel.id, grabado);
      if (!resultado.ok) {
        setError(resultado.mensaje);
        setGrabados((previos) => {
          const revertidos = new Set(previos);
          if (grabado) revertidos.delete(reel.clave);
          else revertidos.add(reel.clave);
          return revertidos;
        });
      }
    });
  }

  function abrir(reel: ReelPlano) {
    setSecuencia(visibles);
    setPosicion(Math.max(0, visibles.findIndex((r) => r.clave === reel.clave)));
  }

  const cerrar = useCallback(() => setSecuencia(null), []);
  const mover = useCallback(
    (delta: number) =>
      setPosicion((actual) =>
        Math.min(Math.max(actual + delta, 0), Math.max((secuencia?.length ?? 1) - 1, 0)),
      ),
    [secuencia],
  );

  function grabadoYSiguiente(reel: ReelPlano) {
    const yaGrabado = grabados.has(reel.clave);
    guardar(reel, !yaGrabado);
    if (!yaGrabado && secuencia && posicion < secuencia.length - 1) setPosicion(posicion + 1);
  }

  const porLeccion = reels.lecciones
    .map((l) => ({ ...l, reels: visibles.filter((r) => r.numero === l.numero) }))
    .filter((l) => l.reels.length > 0);

  return (
    <div className="pb-16 pt-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.035em] md:text-4xl">Reels por grabar</h1>
          <p className="mt-2 text-tenue">Los ganchos verticales de los shorts, frase a frase.</p>
        </div>
        <label htmlFor={idLeccion} className="grid w-full gap-1 text-sm md:w-auto">
          <span className="text-tenue">Lección</span>
          <select
            id={idLeccion}
            value={leccion}
            onChange={(evento) => elegirLeccion(evento.target.value)}
            className="min-h-11 w-full min-w-0 rounded-xl border border-borde bg-superficie px-3 text-base text-texto md:max-w-sm md:text-sm"
          >
            <option value={TODAS}>Todas las lecciones</option>
            {reels.lecciones.map((l) => (
              <option key={l.numero} value={String(l.numero)}>
                {dosCifras(l.numero)} · {l.titulo}
              </option>
            ))}
          </select>
        </label>
      </header>

      <div className="sticky top-0 z-10 -mx-4 mt-5 bg-fondo/90 px-4 py-3 backdrop-blur md:mx-0 md:px-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">
            {hechos} de {deLaSeleccion.length} grabados
          </p>
          <label htmlFor={idOcultar} className="flex items-center gap-2 text-sm text-tenue">
            <input
              id={idOcultar}
              type="checkbox"
              checked={ocultar}
              onChange={(evento) => setOcultar(evento.target.checked)}
              className="size-4 accent-[var(--marca)]"
            />
            Ocultar los grabados
          </label>
        </div>
        <div
          role="progressbar"
          aria-label="Reels grabados"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={porcentaje}
          className="mt-2 h-2 overflow-hidden rounded-full bg-carbon"
        >
          <span
            className="block h-full rounded-full bg-verde transition-[width] duration-500"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      <aside className="mt-4 rounded-2xl border border-borde bg-superficie p-4 text-sm leading-6 text-tenue">
        <strong className="text-texto">📱 iPhone en vertical.</strong> Una toma por frase, con
        energía y mirando a cámara. Deja un segundo de silencio antes y después de cada frase.
        «Leer en grande» abre la frase a pantalla completa.
      </aside>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-rojo">
          {error}
        </p>
      ) : null}

      {deLaSeleccion.length > 0 && visibles.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-verde/40 bg-verde/10 p-4 text-verde">
          Todo grabado. Pásale los vídeos a Claude para montar los shorts.
        </p>
      ) : null}
      {deLaSeleccion.length === 0 ? (
        <p className="mt-6 text-tenue">Esta selección no tiene ganchos en el guion.</p>
      ) : null}

      {porLeccion.map((l) => (
        <section key={l.numero} aria-label={`Lección ${l.numero}`} className="mt-7">
          <h2 className="text-lg font-semibold tracking-[-0.02em]">
            <span className="mr-2 font-mono text-sm text-marca">{dosCifras(l.numero)}</span>
            {l.titulo}
          </h2>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {l.reels.map((reel, i) => {
              const grabado = grabados.has(reel.clave);
              return (
                <li
                  key={reel.clave}
                  aria-label={`${reel.id} · ${reel.titulo}`}
                  className={`entrar rounded-2xl border bg-superficie p-4 ${grabado ? "border-verde/50" : "border-borde"}`}
                  style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                >
                  <p className="flex items-baseline gap-2 text-xs text-tenue">
                    <span className="rounded-full bg-carbon px-2 py-0.5 font-mono text-azul-claro">
                      {reel.id}
                    </span>
                    {reel.titulo}
                    {reel.entregado ? <span className="text-verde">· toma entregada</span> : null}
                  </p>
                  <p className="mt-2 text-lg leading-snug">{reel.texto}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => abrir(reel)}
                      className="min-h-10 rounded-xl border border-marca px-3 text-sm font-semibold text-marca hover:bg-marca hover:text-fondo"
                    >
                      Leer en grande
                    </button>
                    <button
                      type="button"
                      onClick={() => guardar(reel, !grabado)}
                      disabled={pendiente || reel.entregado}
                      aria-pressed={grabado}
                      className={`min-h-10 rounded-xl px-3 text-sm font-semibold disabled:opacity-60 ${
                        grabado ? "border border-verde text-verde" : "bg-carbon text-texto hover:bg-verde hover:text-fondo"
                      }`}
                    >
                      {grabado ? "✓ Grabado" : "Marcar grabado"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {secuencia ? (
        <Pantalla
          secuencia={secuencia}
          posicion={posicion}
          grabados={grabados}
          pendiente={pendiente}
          onMover={mover}
          onGrabado={grabadoYSiguiente}
          onCerrar={cerrar}
        />
      ) : null}
    </div>
  );
}
