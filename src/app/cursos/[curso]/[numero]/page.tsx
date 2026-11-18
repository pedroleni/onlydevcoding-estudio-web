import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AvisoApi } from "@/components/AvisoApi";
import { GrabacionesVoz } from "@/components/GrabacionesVoz";
import { ListaPiezas, VistaVideoFinal } from "@/components/ListaPiezas";
import { PanelEstado } from "@/components/PanelEstado";
import { PanelShorts } from "@/components/acciones/PanelShorts";
import {
  esPestanaLeccion,
  PestanasLeccion,
  type PestanaLeccion,
} from "@/components/PestanasLeccion";
import { GuionEditable } from "@/components/guion/GuionEditable";
import { PublicarLeccion } from "@/components/publicar/PublicarLeccion";
import {
  ApiNoDisponible,
  ErrorApi,
  obtenerAcciones,
  obtenerCursos,
  obtenerLeccion,
  obtenerPublicacion,
  obtenerTeleprompter,
} from "@/lib/api";
import { CURSO_VALIDO } from "@/lib/curso";
import { textoLegible } from "@/lib/texto-legible";
import type {
  Escena,
  EstadoAccion,
  EstadoLeccion,
  Leccion,
  Teleprompter,
  VistaPublicacion,
} from "@/lib/tipos";

const NUMERO_VALIDO = /^[1-9]\d{0,2}$/;

function BloqueGrabacion({
  id,
  titulo,
  escenas,
  avance,
}: {
  id: string;
  titulo: string;
  escenas: Escena[];
  avance: EstadoLeccion["voz"];
}) {
  return (
    <section aria-labelledby={id}>
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id={id}
          className="text-xl font-semibold"
        >
          {titulo}
        </h2>
        <span className="font-mono text-xs text-tenue">
          {avance.hechas}/{avance.total}
        </span>
      </div>

      {escenas.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {escenas.map((escena) => (
            <li
              key={escena.id}
              className="border border-borde bg-superficie p-4 text-sm"
            >
              <span className="font-medium">{textoLegible(escena.titulo)}</span>
              <span className="mt-2 block font-mono text-xs text-tenue">
                {escena.id}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 border border-borde bg-superficie p-5 text-sm text-tenue">
          No hay escenas de {titulo.toLowerCase()}.
        </p>
      )}
    </section>
  );
}

function ContenidoPestana({
  curso,
  leccion,
  pestana,
  publicacion,
  teleprompter,
  acciones,
  piezaSeleccionada,
  redSeleccionada,
}: {
  curso: string;
  leccion: Leccion;
  pestana: PestanaLeccion;
  publicacion: VistaPublicacion | null;
  teleprompter: Teleprompter | null;
  acciones: EstadoAccion[] | null;
  piezaSeleccionada?: string;
  redSeleccionada?: string;
}) {
  if (pestana === "grabaciones") {
    const escenasVoz = teleprompter?.escenas.filter(({ modo }) => modo === "voz");
    return (
      <div role="tabpanel" className="grid gap-8">
        {escenasVoz ? (
          <GrabacionesVoz
            curso={curso}
            numero={leccion.numero}
            escenas={escenasVoz}
            avance={leccion.estado.voz}
            sinAlinear={leccion.montaje?.sin_alinear ?? []}
            accion={acciones?.find(({ id }) => id === "alinear-voz") ?? null}
          />
        ) : (
          <BloqueGrabacion
            id="grabacion-voz"
            titulo="Voz en off"
            escenas={leccion.escenas.filter(({ modo }) => modo === "voz")}
            avance={leccion.estado.voz}
          />
        )}
        <BloqueGrabacion
          id="grabacion-camara"
          titulo="Cámara"
          escenas={leccion.escenas.filter(({ modo }) => modo === "camara")}
          avance={leccion.estado.camara}
        />
      </div>
    );
  }

  if (pestana === "video") {
    return (
      <div role="tabpanel">
        <VistaVideoFinal
          key={leccion.slug}
          curso={curso}
          numero={leccion.numero}
          pieza={
            leccion.piezas.find(({ tipo }) => tipo === "leccion") ?? null
          }
          previas={leccion.previas}
          acciones={acciones}
        />
      </div>
    );
  }

  if (pestana === "shorts") {
    return (
      <div role="tabpanel" className="grid gap-8">
        <PanelShorts curso={curso} numero={leccion.numero} acciones={acciones} />
        <ListaPiezas
          piezas={leccion.piezas.filter(
            ({ tipo }) => tipo === "reel" || tipo === "short",
          )}
        />
      </div>
    );
  }

  if (pestana === "publicar") {
    return publicacion ? (
      <PublicarLeccion
        vista={publicacion}
        piezaSeleccionada={piezaSeleccionada}
        redSeleccionada={redSeleccionada}
      />
    ) : (
      <p role="tabpanel" className="border border-borde bg-superficie p-6 text-tenue">
        No se ha encontrado la información de publicación de esta lección.
      </p>
    );
  }

  const ultimaPrevia =
    leccion.previas.at(-1) ?? leccion.estado.previa ?? null;

  return (
    <GuionEditable
      curso={curso}
      numero={leccion.numero}
      escenas={leccion.escenas}
      previa={ultimaPrevia}
      teleprompter={teleprompter}
      montaje={leccion.montaje}
      acciones={acciones}
    />
  );
}

function CargandoLeccion() {
  return (
    <div className="border border-borde bg-superficie p-6 text-tenue">
      Cargando lección…
    </div>
  );
}

async function lecturaApiOpcional<T>(lectura: Promise<T>): Promise<T | null> {
  try {
    return await lectura;
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return null;
    }
    throw error;
  }
}

async function ContenidoLeccion({
  params,
  searchParams,
}: PageProps<"/cursos/[curso]/[numero]">) {
  const [{ curso, numero: numeroTexto }, consulta] = await Promise.all([
    params,
    searchParams,
  ]);
  await connection();

  if (!CURSO_VALIDO.test(curso) || !NUMERO_VALIDO.test(numeroTexto)) {
    notFound();
  }

  const numero = Number(numeroTexto);

  let leccion;
  let cursos;

  try {
    [leccion, cursos] = await Promise.all([
      obtenerLeccion(curso, numero),
      obtenerCursos(),
    ]);
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return <AvisoApi error={error} />;
    }

    throw error;
  }

  const cursoEncontrado = cursos.find(({ id }) => id === curso);

  if (leccion === null || !cursoEncontrado) {
    notFound();
  }

  const valorPestana = Array.isArray(consulta.pestana)
    ? consulta.pestana[0]
    : consulta.pestana;
  const pestana: PestanaLeccion = esPestanaLeccion(valorPestana)
    ? valorPestana
    : "guion";
  const valorPieza = Array.isArray(consulta.pieza)
    ? consulta.pieza[0]
    : consulta.pieza;
  const valorRed = Array.isArray(consulta.red) ? consulta.red[0] : consulta.red;

  let publicacion: VistaPublicacion | null = null;
  let teleprompter: Teleprompter | null = null;
  let acciones: EstadoAccion[] | null = null;
  if (pestana === "publicar") {
    try {
      publicacion = await obtenerPublicacion(curso, numero);
    } catch (error) {
      if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
        return <AvisoApi error={error} />;
      }
      throw error;
    }
  }
  if (pestana === "guion" || pestana === "grabaciones") {
    [teleprompter, acciones] = await Promise.all([
      lecturaApiOpcional(obtenerTeleprompter(curso, numero)),
      lecturaApiOpcional(obtenerAcciones(curso, numero)),
    ]);
  } else if (pestana === "video" || pestana === "shorts") {
    acciones = await lecturaApiOpcional(obtenerAcciones(curso, numero));
  }

  return (
    <>
      <header>
        <Link
          href={`/cursos/${encodeURIComponent(curso)}`}
          className="text-sm font-medium text-marca hover:text-texto"
        >
          Volver al curso
        </Link>
        <div className="mt-5 flex flex-col items-start justify-between gap-5 md:flex-row md:gap-8">
          <div>
            <p className="text-sm text-tenue">
              {cursoEncontrado.nombre} · Lección {leccion.numero}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.035em] md:text-5xl">
              {leccion.titulo}
            </h1>
            {leccion.subtitulo ? (
              <p className="mt-3 max-w-2xl leading-7 text-tenue">
                {leccion.subtitulo}
              </p>
            ) : null}
          </div>

          <Link
            href={`/teleprompter?curso=${encodeURIComponent(curso)}&leccion=${numero}`}
            className="inline-flex min-h-11 shrink-0 items-center border border-marca bg-carbon px-4 text-sm font-medium text-texto transition-colors hover:bg-marca"
          >
            Abrir en el teleprompter
          </Link>
        </div>
      </header>

      <div className="mt-8">
        <PestanasLeccion curso={curso} numero={numero} activa={pestana} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <ContenidoPestana
          curso={curso}
          leccion={leccion}
          pestana={pestana}
          publicacion={publicacion}
          teleprompter={teleprompter}
          acciones={acciones}
          piezaSeleccionada={valorPieza}
          redSeleccionada={valorRed}
        />
        <PanelEstado estado={leccion.estado} montaje={leccion.montaje} />
      </div>
    </>
  );
}

export default function PaginaLeccion({
  params,
  searchParams,
}: PageProps<"/cursos/[curso]/[numero]">) {
  return (
    <section className="py-8 md:py-12">
      <Suspense fallback={<CargandoLeccion />}>
        <ContenidoLeccion params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}
