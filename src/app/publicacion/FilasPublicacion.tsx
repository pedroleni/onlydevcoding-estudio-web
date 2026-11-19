import Link from "next/link";

import type { DatosCurso } from "@/app/publicacion/datos-publicacion";
import {
  plural,
  rangoNumeros,
  type LeccionContada,
} from "@/lib/estadisticas-publicacion";
import { fechaPublicacionLegible } from "@/lib/fecha-publicacion";
import { faltaVideoPropio, nombreRed } from "@/lib/redes-publicacion";
import type { EstadoRed, PiezaVista, RedVista } from "@/lib/tipos";
import { errorUrlPublicacion } from "@/lib/url-publicacion";

const ICONO: Record<EstadoRed["estado"], string> = {
  publicado: "✅",
  programado: "📅",
  pendiente: "⬜",
};

const ESTADO_LEGIBLE: Record<EstadoRed["estado"], string> = {
  publicado: "subido",
  programado: "programado",
  pendiente: "pendiente",
};

const CHIP: Record<EstadoRed["estado"], string> = {
  publicado: "border-borde text-tenue",
  programado: "border-marca text-azul-claro",
  pendiente: "border-ambar text-ambar",
};

function hrefPublicar(curso: string, numero: number, pieza: string, red: string): string {
  return `/cursos/${encodeURIComponent(curso)}/${numero}?pestana=publicar&pieza=${encodeURIComponent(pieza)}&red=${encodeURIComponent(red)}`;
}

function urlSegura(url: string | null): string | null {
  return url && errorUrlPublicacion(url) === null ? url : null;
}

function ChipRed({
  curso,
  numero,
  pieza,
  red,
}: {
  curso: string;
  numero: number;
  pieza: PiezaVista;
  red: RedVista;
}) {
  const estado = red.estado.estado;
  const sinVideo = estado !== "publicado" && faltaVideoPropio(pieza, red);
  return (
    <Link
      href={hrefPublicar(curso, numero, pieza.id, red.red)}
      aria-label={`${ICONO[estado]} ${nombreRed(red.red)}, ${ESTADO_LEGIBLE[estado]}${sinVideo ? ", sin vídeo" : ""}`}
      className={`border bg-carbon px-2 py-0.5 text-xs hover:border-marca hover:text-texto ${CHIP[estado]}`}
    >
      <span aria-hidden="true">{ICONO[estado]}</span> {nombreRed(red.red)}
      {sinVideo ? " · sin vídeo" : null}
    </Link>
  );
}

function CabeceraLeccion({
  leccion,
  cuenta,
  color,
}: {
  leccion: LeccionContada;
  cuenta: string;
  color: string;
}) {
  return (
    <>
      <span className="font-mono text-sm text-marca">
        {String(leccion.numero).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1 font-semibold">{leccion.titulo}</span>
      <span className={`shrink-0 text-xs ${color}`}>{cuenta}</span>
    </>
  );
}

function EstadoPiezaPendiente({
  pendientes,
  prevista,
}: {
  pendientes: RedVista[];
  prevista: boolean;
}) {
  if (pendientes.length === 0) {
    return <span className="ml-2 text-xs text-verde">· todo subido</span>;
  }
  if (prevista) {
    return <span className="ml-2 text-xs text-tenue">· sin preparar</span>;
  }
  return null;
}

export function QuedaPorSubir({ datos }: { datos: DatosCurso }) {
  const { curso, contadas, sinLeer } = datos;
  const conPendientes = contadas.filter((leccion) => leccion.empezada && leccion.pendientes > 0);
  const sinEmpezar = contadas.filter((leccion) => !leccion.empezada && leccion.pendientes > 0);
  const quedanSinEmpezar = sinEmpezar.reduce((suma, leccion) => suma + leccion.pendientes, 0);

  return (
    <section aria-labelledby={`queda-${curso.id}`} className="mt-8">
      <h2 id={`queda-${curso.id}`} className="text-lg font-semibold tracking-[-0.02em]">
        Queda por subir
      </h2>
      {conPendientes.length === 0 ? (
        <p className="mt-3 text-sm text-tenue">No queda nada por subir de lo preparado.</p>
      ) : null}
      <div className="mt-3 grid gap-2.5">
        {conPendientes.map((leccion) => (
          <article
            key={leccion.numero}
            aria-label={`Lección ${leccion.numero}`}
            className="border border-borde bg-superficie"
          >
            <h3 className="flex items-baseline gap-2 px-3 py-2.5 text-sm">
              <CabeceraLeccion
                leccion={leccion}
                cuenta={`${leccion.pendientes} por subir`}
                color="text-ambar"
              />
            </h3>
            <ul>
              {leccion.piezas
                .filter((pieza) => pieza.redes.length > 0)
                .map(({ clave, titulo, pieza, redes, prevista, pendientes }) => (
                  <li
                    key={clave}
                    aria-label={titulo}
                    className={`grid gap-1.5 border-t border-borde px-3 py-2 ${
                      pendientes.length === 0 ? "opacity-70" : ""
                    }`}
                  >
                    <span className="text-sm">
                      {titulo}
                      <EstadoPiezaPendiente pendientes={pendientes} prevista={prevista} />
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {redes.map((red) => (
                        <ChipRed
                          key={red.red}
                          curso={curso.id}
                          numero={leccion.numero}
                          pieza={pieza}
                          red={red}
                        />
                      ))}
                    </span>
                  </li>
                ))}
            </ul>
          </article>
        ))}
      </div>
      {sinEmpezar.length > 0 ? (
        <details className="mt-2.5 border border-dashed border-borde bg-superficie">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 font-semibold">
              {sinEmpezar.length === 1 ? "Lección" : "Lecciones"}{" "}
              {rangoNumeros(sinEmpezar.map((leccion) => leccion.numero))}: sin empezar
            </span>
            <span className="shrink-0 text-xs text-ambar">{quedanSinEmpezar} por subir</span>
          </summary>
          <ul className="text-sm">
            {sinEmpezar.map((leccion) => (
              <li
                key={leccion.numero}
                className="flex items-baseline gap-2 border-t border-borde px-3 py-2"
              >
                <CabeceraLeccion
                  leccion={leccion}
                  cuenta={`${leccion.pendientes} por subir`}
                  color="text-tenue"
                />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {sinLeer.length > 0 ? (
        <p className="mt-2 text-sm text-ambar">
          No se pudo leer la publicación de {sinLeer.length === 1 ? "la lección" : "las lecciones"}{" "}
          {rangoNumeros(sinLeer)}.
        </p>
      ) : null}
    </section>
  );
}

export function YaSubido({ datos }: { datos: DatosCurso }) {
  const { curso, contadas } = datos;
  const conSubidas = contadas.filter((leccion) => leccion.subidas > 0);
  if (conSubidas.length === 0) return null;

  return (
    <section aria-labelledby={`subido-${curso.id}`} className="mt-8">
      <h2 id={`subido-${curso.id}`} className="text-lg font-semibold tracking-[-0.02em]">
        Ya subido
      </h2>
      <div className="mt-3 grid gap-2.5">
        {conSubidas.map((leccion) => (
          <details key={leccion.numero} className="group border border-borde bg-superficie">
            <summary className="flex cursor-pointer list-none items-baseline gap-2 px-3 py-2.5 text-sm [&::-webkit-details-marker]:hidden">
              <CabeceraLeccion
                leccion={leccion}
                cuenta={plural(leccion.subidas, "subida", "subidas")}
                color="text-verde"
              />
            </summary>
            <ul>
              {leccion.piezas
                .filter((pieza) => pieza.subidas.length > 0)
                .map(({ clave, titulo, subidas }) => (
                  <li key={clave} className="border-t border-borde px-3 py-2">
                    <span className="text-sm">{titulo}</span>
                    <ul className="mt-1 grid gap-0.5 text-[13px] text-tenue">
                      {subidas.map(({ red, estado }) => {
                        const url = urlSegura(estado.url);
                        return (
                          <li key={red}>
                            ✅ {nombreRed(red)}
                            {estado.fecha
                              ? ` · ${fechaPublicacionLegible(estado.fecha, { timeZone: "Europe/Madrid" })}`
                              : null}{" "}
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-1 text-marca hover:text-texto"
                              >
                                abrir ↗
                              </a>
                            ) : (
                              <span className="ml-1">sin enlace</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
            </ul>
          </details>
        ))}
      </div>
    </section>
  );
}
