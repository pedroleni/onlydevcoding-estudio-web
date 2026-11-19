"use client";

import { useCallback, useId, useMemo, useState, useTransition } from "react";

import {
  dosCifras,
  PantallaReel,
  type ReelPlano,
} from "@/components/teleprompter/PantallaReel";
import { marcarGanchoGrabado } from "@/lib/acciones-reels";
import type { ReelsCurso } from "@/lib/tipos";

export const TODAS = "todas";

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

function SelectorLeccion({
  id,
  leccion,
  lecciones,
  onElegir,
}: {
  id: string;
  leccion: string;
  lecciones: ReelsCurso["lecciones"];
  onElegir: (valor: string) => void;
}) {
  return (
    <label htmlFor={id} className="grid w-full gap-1 text-sm md:w-auto">
      <span className="text-tenue">Lección</span>
      <select
        id={id}
        value={leccion}
        onChange={(evento) => onElegir(evento.target.value)}
        className="min-h-11 w-full min-w-0 rounded-xl border border-borde bg-superficie px-3 text-base text-texto md:max-w-sm md:text-sm"
      >
        <option value={TODAS}>Todas las lecciones</option>
        {lecciones.map((l) => (
          <option key={l.numero} value={String(l.numero)}>
            {dosCifras(l.numero)} · {l.titulo}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProgresoReels({
  idOcultar,
  hechos,
  total,
  porcentaje,
  ocultar,
  onOcultar,
}: {
  idOcultar: string;
  hechos: number;
  total: number;
  porcentaje: number;
  ocultar: boolean;
  onOcultar: (ocultar: boolean) => void;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mt-5 bg-fondo/90 px-4 py-3 backdrop-blur md:mx-0 md:px-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold">
          {hechos} de {total} grabados
        </p>
        <label htmlFor={idOcultar} className="flex items-center gap-2 text-sm text-tenue">
          <input
            id={idOcultar}
            type="checkbox"
            checked={ocultar}
            onChange={(evento) => onOcultar(evento.target.checked)}
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
  );
}

function TarjetaReel({
  reel,
  indice,
  grabado,
  pendiente,
  onAbrir,
  onGuardar,
}: {
  reel: ReelPlano;
  indice: number;
  grabado: boolean;
  pendiente: boolean;
  onAbrir: (reel: ReelPlano) => void;
  onGuardar: (reel: ReelPlano, grabado: boolean) => void;
}) {
  return (
    <li
      aria-label={`${reel.id} · ${reel.titulo}`}
      className={`entrar rounded-2xl border bg-superficie p-4 ${grabado ? "border-verde/50" : "border-borde"}`}
      style={{ animationDelay: `${Math.min(indice, 10) * 40}ms` }}
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
          onClick={() => onAbrir(reel)}
          className="min-h-10 rounded-xl border border-marca px-3 text-sm font-semibold text-marca hover:bg-marca hover:text-fondo"
        >
          Leer en grande
        </button>
        <button
          type="button"
          onClick={() => onGuardar(reel, !grabado)}
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
}

function SeccionLeccion({
  numero,
  titulo,
  reels,
  grabados,
  pendiente,
  onAbrir,
  onGuardar,
}: {
  numero: number;
  titulo: string;
  reels: ReelPlano[];
  grabados: Set<string>;
  pendiente: boolean;
  onAbrir: (reel: ReelPlano) => void;
  onGuardar: (reel: ReelPlano, grabado: boolean) => void;
}) {
  return (
    <section aria-label={`Lección ${numero}`} className="mt-7">
      <h2 className="text-lg font-semibold tracking-[-0.02em]">
        <span className="mr-2 font-mono text-sm text-marca">{dosCifras(numero)}</span>
        {titulo}
      </h2>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {reels.map((reel, i) => (
          <TarjetaReel
            key={reel.clave}
            reel={reel}
            indice={i}
            grabado={grabados.has(reel.clave)}
            pendiente={pendiente}
            onAbrir={onAbrir}
            onGuardar={onGuardar}
          />
        ))}
      </ul>
    </section>
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
        <SelectorLeccion
          id={idLeccion}
          leccion={leccion}
          lecciones={reels.lecciones}
          onElegir={elegirLeccion}
        />
      </header>

      <ProgresoReels
        idOcultar={idOcultar}
        hechos={hechos}
        total={deLaSeleccion.length}
        porcentaje={porcentaje}
        ocultar={ocultar}
        onOcultar={setOcultar}
      />

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
        <SeccionLeccion
          key={l.numero}
          numero={l.numero}
          titulo={l.titulo}
          reels={l.reels}
          grabados={grabados}
          pendiente={pendiente}
          onAbrir={abrir}
          onGuardar={guardar}
        />
      ))}

      {secuencia ? (
        <PantallaReel
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
