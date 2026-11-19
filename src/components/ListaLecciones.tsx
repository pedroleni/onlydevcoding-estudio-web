"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, useId, useMemo, useState } from "react";

import { gruposPublicacion } from "@/lib/curso";
import {
  type EstadoFicha,
  type FichaLeccion,
  estadoFicha,
  filtrarFichas,
  modulosCurso,
  pasosLeccion,
  publicacionLeccion,
} from "@/lib/lecciones-curso";

const ESTADOS: Record<EstadoFicha, { texto: string; clase: string }> = {
  terminada: { texto: "Terminada", clase: "bg-verde/15 text-verde" },
  "en-marcha": { texto: "En marcha", clase: "bg-marca/15 text-azul-claro" },
  "por-empezar": { texto: "Por empezar", clase: "bg-carbon text-tenue" },
  "por-preparar": { texto: "Por preparar", clase: "bg-carbon text-tenue" },
};

const PASOS = [
  { clave: "voz", icono: "🎙", nombre: "Voz", color: "#a78bfa" },
  { clave: "camara", icono: "🎥", nombre: "Cámara", color: "#38bdf8" },
  { clave: "video", icono: "🎬", nombre: "Vídeo final", color: "#34d399" },
  { clave: "publicacion", icono: "📣", nombre: "Publicación", color: "#fbbf24" },
] as const;

// Retraso de entrada escalonado, con tope para que una lista larga no tarde en aparecer.
function retraso(indice: number): CSSProperties {
  return { animationDelay: `${Math.min(indice, 18) * 35}ms` };
}

function dosCifras(numero: number): string {
  return String(numero).padStart(2, "0");
}

function Pasos({ ficha }: { ficha: FichaLeccion }) {
  if (!ficha.leccion) return null;
  const { estado } = ficha.leccion;
  const pasos = pasosLeccion(estado);
  const publicacion = publicacionLeccion(estado);
  const detalle: Record<(typeof PASOS)[number]["clave"], string> = {
    voz: `${estado.voz.hechas}/${estado.voz.total}`,
    camara: `${estado.camara.hechas}/${estado.camara.total}`,
    video: estado.video_final ? "✓" : "—",
    publicacion: `${publicacion.hechas}/${publicacion.total}`,
  };

  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:grid-cols-4">
      {PASOS.map(({ clave, icono, nombre, color }) => (
        <li key={clave} aria-label={`${nombre} ${detalle[clave]}`}>
          <span className="flex items-baseline justify-between gap-2 text-tenue">
            <span>
              <span aria-hidden="true">{icono}</span> {nombre}
            </span>
            <span className="font-mono text-texto">{detalle[clave]}</span>
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-carbon" aria-hidden="true">
            <span
              className="barra-crece block h-full rounded-full"
              style={{ width: `${Math.round(pasos[clave] * 100)}%`, background: color }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function TarjetaLeccion({
  curso,
  ficha,
  color,
  indice,
}: {
  curso: string;
  ficha: FichaLeccion;
  color: string;
  indice: number;
}) {
  const estado = estadoFicha(ficha);
  const pill = ESTADOS[estado];
  const estilo = { ...retraso(indice), "--mod": color } as CSSProperties;
  const cabecera = (
    <div className="flex items-start gap-3">
      <span
        className="grid size-11 shrink-0 place-items-center rounded-xl font-mono text-sm font-semibold"
        style={{
          color,
          background: `color-mix(in srgb, ${color} 16%, transparent)`,
        }}
      >
        {dosCifras(ficha.numero)}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-semibold leading-snug tracking-[-0.01em] [overflow-wrap:anywhere]">
          {ficha.titulo}
        </h3>
        <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${pill.clase}`}>
          {pill.texto}
        </span>
      </div>
    </div>
  );

  if (!ficha.leccion) {
    return (
      <li
        className="entrar rounded-2xl border border-dashed border-borde p-4 opacity-60"
        style={estilo}
        aria-label={`Lección ${ficha.numero}: ${ficha.titulo}, por preparar`}
      >
        {cabecera}
      </li>
    );
  }

  return (
    <li className="entrar" style={estilo}>
      <Link
        href={`/cursos/${encodeURIComponent(curso)}/${ficha.numero}`}
        className="tarjeta-leccion block h-full rounded-2xl border border-borde bg-superficie p-4 transition duration-200 hover:-translate-y-0.5 active:translate-y-px"
      >
        {cabecera}
        <Pasos ficha={ficha} />
        {gruposPublicacion(ficha.leccion.estado).map((grupo) => (
          <div
            key={grupo.titulo ?? "redes"}
            className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-tenue"
          >
            {grupo.titulo ? (
              <span className="mr-1 font-medium text-texto">{grupo.titulo}</span>
            ) : null}
            {grupo.marcas.map((marca) => (
              <span key={marca.texto} className="rounded-full bg-carbon px-2 py-0.5">
                {marca.icono} {marca.texto}
              </span>
            ))}
          </div>
        ))}
      </Link>
    </li>
  );
}

export function ListaLecciones({
  curso,
  fichas,
}: {
  curso: string;
  fichas: FichaLeccion[];
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [numero, setNumero] = useState("");
  const idTexto = useId();
  const idNumero = useId();

  const modulos = useMemo(() => modulosCurso(fichas), [fichas]);
  const visibles = useMemo(() => filtrarFichas(fichas, texto, numero), [fichas, texto, numero]);
  const filtrando = texto.trim() !== "" || numero.trim() !== "";

  function irAlCapitulo() {
    const ficha = visibles.length === 1 ? visibles[0] : null;
    if (ficha?.leccion) router.push(`/cursos/${encodeURIComponent(curso)}/${ficha.numero}`);
  }

  let indice = 0;
  return (
    <>
      <div
        role="search"
        className="sticky top-0 z-10 -mx-4 mt-6 grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2 bg-fondo/90 px-4 py-3 backdrop-blur md:mx-0 md:grid-cols-[minmax(0,1fr)_10rem] md:px-0"
      >
        <label htmlFor={idTexto} className="sr-only">
          Buscar lección
        </label>
        <input
          id={idTexto}
          type="search"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          placeholder="🔍 Buscar lección"
          className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-base text-texto placeholder:text-tenue focus:border-marca md:text-sm"
        />
        <label htmlFor={idNumero} className="sr-only">
          Número de capítulo
        </label>
        <input
          id={idNumero}
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={numero}
          onChange={(evento) => setNumero(evento.target.value.replace(/\D/g, "").slice(0, 3))}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") irAlCapitulo();
          }}
          placeholder="Nº capítulo"
          className="min-h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-base text-texto placeholder:text-tenue focus:border-marca md:text-sm"
        />
      </div>

      {filtrando ? (
        <p aria-live="polite" className="mt-1 text-sm text-tenue">
          {visibles.length === 0
            ? "Ninguna lección coincide con la búsqueda."
            : `${visibles.length} ${visibles.length === 1 ? "lección" : "lecciones"}`}
        </p>
      ) : null}

      {modulos.map((modulo, posicion) => {
        const delModulo = fichas.filter((f) => (f.modulo ?? "Otras lecciones") === modulo.nombre);
        const mostradas = visibles.filter((f) => (f.modulo ?? "Otras lecciones") === modulo.nombre);
        if (mostradas.length === 0) return null;
        const terminadas = delModulo.filter((f) => estadoFicha(f) === "terminada").length;
        const preparadas = delModulo.filter((f) => f.leccion !== null).length;
        return (
          <section
            key={modulo.nombre}
            aria-label={modulo.nombre}
            className="mt-8"
            style={{ "--mod": modulo.color } as CSSProperties}
          >
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: modulo.color, boxShadow: `0 0 12px ${modulo.color}` }}
              />
              <h2 className="text-lg font-semibold tracking-[-0.02em]">
                <span className="mr-2 font-mono text-sm" style={{ color: modulo.color }}>
                  {dosCifras(posicion + 1)}
                </span>
                {modulo.nombre}
              </h2>
              <span className="text-xs text-tenue">
                {preparadas}/{delModulo.length} preparadas · {terminadas} terminadas
              </span>
            </header>
            <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {mostradas.map((ficha) => (
                <TarjetaLeccion
                  key={ficha.numero}
                  curso={curso}
                  ficha={ficha}
                  color={modulo.color}
                  indice={indice++}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
