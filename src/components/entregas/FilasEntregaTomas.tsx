import { BOTON_CANCELAR, textoEstadoTrabajo } from "@/components/acciones/BotonAccion";
import { enCurso, porcentaje, type Subida } from "@/components/entregas/modeloEntregaTomas";
import type { Entregas, TomaPropuesta, Trabajo } from "@/lib/tipos";

const MAXIMO_TEXTO = 140;
const CIERRE = "cierre";
const BOTON_QUITAR =
  "inline-flex min-h-10 cursor-pointer items-center justify-center border border-borde px-3 text-sm font-semibold text-tenue transition-colors hover:enabled:border-rojo hover:enabled:text-rojo disabled:cursor-default disabled:opacity-40";

function duracionLegible(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = String(total % 60).padStart(2, "0");
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${resto}`
    : `${minutos}:${resto}`;
}

function recorte(texto: string): string {
  const caracteres = Array.from(texto.trim());
  return caracteres.length > MAXIMO_TEXTO
    ? `${caracteres.slice(0, MAXIMO_TEXTO).join("")}…`
    : caracteres.join("");
}

function etiquetaDestino(id: string, titulo: string): string {
  return titulo && titulo !== id ? `${id} · ${titulo}` : id;
}

export function EstadoTrabajo({
  trabajo,
  enCursoTexto,
  etiqueta,
}: {
  trabajo: Trabajo | null;
  enCursoTexto: string;
  etiqueta: string;
}) {
  if (!trabajo) return null;
  if (trabajo.estado === "en_marcha") {
    const avance = porcentaje(trabajo.progreso);
    return (
      <p role="status" className="m-0 text-sm text-tenue">
        {avance > 0 ? `${enCursoTexto}… ${avance} %` : `${enCursoTexto}…`}
      </p>
    );
  }
  if (trabajo.estado === "hecho") return null;
  return (
    <p role="status" className="m-0 text-sm text-ambar">
      {`${etiqueta}: ${textoEstadoTrabajo(trabajo)}`}
    </p>
  );
}

// Debajo del nombre: la barra mientras está en cola o subiendo y, al acabar, cómo ha acabado.
function EstadoFilaSubida({ subida }: { subida: Subida }) {
  const nombre = subida.archivo.name;
  const avance = porcentaje(subida.fraccion);
  if (enCurso(subida)) {
    return (
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={`Subida de ${nombre}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={avance}
          className="h-2 min-w-0 flex-1 bg-superficie"
        >
          <div className="h-full bg-marca" style={{ width: `${avance}%` }} />
        </div>
        <span className="shrink-0 text-tenue">
          {subida.estado === "esperando" ? "En cola" : `${avance} %`}
        </span>
      </div>
    );
  }
  if (subida.estado === "hecha") return <span className="text-verde">Subida</span>;
  if (subida.estado === "error") {
    return <p role="alert" className="m-0 text-ambar">{subida.mensaje}</p>;
  }
  return <span className="text-tenue">{subida.mensaje ?? "Subida cancelada"}</span>;
}

export function FilaSubida({ subida, alCancelar }: { subida: Subida; alCancelar: () => void }) {
  const nombre = subida.archivo.name;
  return (
    <li className="grid gap-2 border border-borde bg-fondo p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-xs">{nombre}</span>
        {enCurso(subida) ? (
          <button
            type="button"
            className={BOTON_CANCELAR}
            aria-label={`Cancelar la subida de ${nombre}`}
            onClick={alCancelar}
          >
            Cancelar
          </button>
        ) : null}
      </div>
      <EstadoFilaSubida subida={subida} />
    </li>
  );
}

export function FilaToma({
  toma,
  entregas,
  valor,
  bloqueada,
  alCambiar,
  alQuitar,
}: {
  toma: TomaPropuesta;
  entregas: Entregas;
  valor: string;
  bloqueada: boolean;
  alCambiar: (valor: string) => void;
  alQuitar: () => void;
}) {
  const horizontal = toma.orientacion === "horizontal";
  return (
    <li className="grid gap-3 border border-borde bg-fondo p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <span className="break-all font-mono text-xs">{toma.archivo}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-tenue">
            <span>{horizontal ? "Horizontal" : "Vertical"}</span>
            <span>{duracionLegible(toma.duracion)}</span>
            {toma.repite ? <span className="text-ambar">{`Repetida de ${toma.repite.id}`}</span> : null}
          </span>
        </div>
        <button
          type="button"
          className={BOTON_QUITAR}
          aria-label={`Quitar ${toma.archivo}`}
          disabled={bloqueada}
          onClick={alQuitar}
        >
          Quitar
        </button>
      </div>
      {toma.texto.trim() ? (
        <p className="m-0 break-words text-tenue">{recorte(toma.texto)}</p>
      ) : null}
      <label className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-tenue">Destino</span>
        <select
          aria-label={`Destino de ${toma.archivo}`}
          className="min-h-11 w-full max-w-md border border-borde bg-superficie px-3 text-texto"
          value={valor}
          disabled={bloqueada}
          onChange={(evento) => alCambiar(evento.target.value)}
        >
          <option value="">No usar</option>
          {horizontal
            ? entregas.destinos.camara.map(({ id, titulo }) => (
                <option key={id} value={id}>{etiquetaDestino(id, titulo)}</option>
              ))
            : entregas.destinos.ganchos.map(({ id, titulo }) => (
                <option key={id} value={id}>{etiquetaDestino(id, titulo)}</option>
              ))}
          {horizontal ? null : <option value={CIERRE}>Cierre</option>}
        </select>
      </label>
    </li>
  );
}

// Archivo de entregas/ que la propuesta no recoge: sin destino que elegir, solo se puede quitar.
export function FilaSinAnalizar({
  archivo,
  texto,
  bloqueada,
  alQuitar,
}: {
  archivo: string;
  texto: string;
  bloqueada: boolean;
  alQuitar: () => void;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border border-borde bg-fondo p-4 text-sm">
      <div className="grid min-w-0 gap-1">
        <span className="break-all font-mono text-xs">{archivo}</span>
        <span className="text-ambar">{texto}</span>
      </div>
      <button
        type="button"
        className={BOTON_QUITAR}
        aria-label={`Quitar ${archivo}`}
        disabled={bloqueada}
        onClick={alQuitar}
      >
        Quitar
      </button>
    </li>
  );
}
