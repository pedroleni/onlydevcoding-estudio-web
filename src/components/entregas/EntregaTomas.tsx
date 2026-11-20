"use client";

import {
  EstadoTrabajo,
  FilaSinAnalizar,
  FilaSubida,
  FilaToma,
} from "@/components/entregas/FilasEntregaTomas";
import type { Subida } from "@/components/entregas/modeloEntregaTomas";
import { useEntregaTomas, type OpcionesEntregaTomas } from "@/components/entregas/useEntregaTomas";
import type { AsignacionToma, Entregas, TomaPropuesta } from "@/lib/tipos";

const ACEPTA = "video/quicktime,video/mp4,.mov,.mp4";
const BOTON =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-marca bg-carbon px-4 text-sm font-semibold text-texto transition-colors hover:enabled:bg-marca disabled:cursor-default disabled:opacity-40";

function claseEstadoZona(desactivada: boolean, arrastrando: boolean): string {
  if (desactivada) return "cursor-default border-borde bg-superficie opacity-60";
  return `cursor-pointer focus-within:border-marca hover:border-marca ${
    arrastrando ? "border-marca bg-carbon" : "border-borde bg-superficie"
  }`;
}

function claseZona(compacta: boolean, desactivada: boolean, arrastrando: boolean): string {
  const forma = compacta
    ? "flex flex-wrap items-baseline justify-center gap-x-3 px-4 py-2.5"
    : "grid justify-items-center gap-1 p-6";
  return `border border-dashed text-center transition-colors ${forma} ${claseEstadoZona(
    desactivada,
    arrastrando,
  )}`;
}

function ZonaEntrega({
  compacta,
  desactivada,
  arrastrando,
  alArrastrar,
  alAnadir,
}: {
  compacta: boolean;
  desactivada: boolean;
  arrastrando: boolean;
  alArrastrar: (arrastrando: boolean) => void;
  alAnadir: (archivos: File[]) => void;
}) {
  return (
    <label
      className={claseZona(compacta, desactivada, arrastrando)}
      onDragOver={(evento) => {
        evento.preventDefault();
        if (!desactivada) alArrastrar(true);
      }}
      onDragLeave={() => alArrastrar(false)}
      onDrop={(evento) => {
        evento.preventDefault();
        alArrastrar(false);
        alAnadir(Array.from(evento.dataTransfer.files));
      }}
    >
      <input
        type="file"
        multiple
        accept={ACEPTA}
        disabled={desactivada}
        className="sr-only"
        onChange={(evento) => {
          alAnadir(Array.from(evento.target.files ?? []));
          evento.target.value = "";
        }}
      />
      <span className="font-semibold">⬆ Entregar los vídeos de la cámara</span>
      <span className="text-sm text-tenue">
        {desactivada
          ? "Espera a que se identifiquen las tomas para entregar más."
          : "Arrastra aquí las tomas (Facetune, iPhone…)"}
      </span>
    </label>
  );
}

function ListaSubidas({
  subidas,
  alCancelar,
}: {
  subidas: Subida[];
  alCancelar: (clave: number) => void;
}) {
  if (subidas.length === 0) return null;
  return (
    <ul className="grid gap-2" aria-label="Subidas">
      {subidas.map((subida) => (
        <FilaSubida
          key={subida.clave}
          subida={subida}
          alCancelar={() => alCancelar(subida.clave)}
        />
      ))}
    </ul>
  );
}

// Las tomas de entregas/: las analizadas con su destino, las que no y los botones para colocar o
// para volver a identificar.
function TomasEntregadas({
  entregas,
  tomas,
  sinAnalizar,
  textoSinAnalizar,
  valorDe,
  asignaciones,
  bloqueada,
  mostrarIdentificar,
  identificarDesactivado,
  alCambiarDestino,
  alQuitar,
  alColocar,
  alIdentificar,
}: {
  entregas: Entregas | null;
  tomas: TomaPropuesta[];
  sinAnalizar: Entregas["archivos"];
  textoSinAnalizar: string;
  valorDe: (archivo: string) => string;
  asignaciones: AsignacionToma[];
  bloqueada: boolean;
  mostrarIdentificar: boolean;
  identificarDesactivado: boolean;
  alCambiarDestino: (archivo: string, valor: string) => void;
  alQuitar: (archivo: string) => void;
  alColocar: () => void;
  alIdentificar: () => void;
}) {
  if (tomas.length === 0 && sinAnalizar.length === 0) return null;
  return (
    <div className="grid gap-3">
      <h3 className="m-0 text-base font-semibold">Tomas entregadas</h3>
      <ul className="grid gap-3">
        {tomas.map((toma) => (
          <FilaToma
            key={toma.archivo}
            toma={toma}
            entregas={entregas as Entregas}
            valor={valorDe(toma.archivo)}
            bloqueada={bloqueada}
            alCambiar={(valor) => alCambiarDestino(toma.archivo, valor)}
            alQuitar={() => alQuitar(toma.archivo)}
          />
        ))}
        {sinAnalizar.map(({ archivo }) => (
          <FilaSinAnalizar
            key={archivo}
            archivo={archivo}
            texto={textoSinAnalizar}
            bloqueada={bloqueada}
            alQuitar={() => alQuitar(archivo)}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        {tomas.length > 0 ? (
          <button
            type="button"
            className={BOTON}
            disabled={bloqueada || asignaciones.every(({ destino }) => destino === null)}
            onClick={alColocar}
          >
            Colocar las tomas
          </button>
        ) : null}
        {mostrarIdentificar ? (
          <button
            type="button"
            className={BOTON}
            disabled={identificarDesactivado}
            onClick={alIdentificar}
          >
            Identificar las tomas
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EntregaTomas({
  compacta = false,
  ...opciones
}: OpcionesEntregaTomas & {
  // Una sola franja baja (en el teleprompter, para no quitar sitio al texto).
  compacta?: boolean;
}) {
  const entrega = useEntregaTomas(opciones);
  return (
    <section aria-label="Entregar las tomas de cámara" className={`grid ${compacta ? "gap-2" : "gap-4"}`}>
      <ZonaEntrega
        compacta={compacta}
        desactivada={entrega.entregaDesactivada}
        arrastrando={entrega.arrastrando}
        alArrastrar={entrega.setArrastrando}
        alAnadir={entrega.alAnadir}
      />

      <ListaSubidas subidas={entrega.subidas} alCancelar={entrega.alCancelarSubida} />

      <EstadoTrabajo
        trabajo={entrega.identificacion}
        enCursoTexto="Identificando las tomas"
        etiqueta="Identificar las tomas"
      />

      {entrega.errorLectura ? (
        <p role="alert" className="m-0 text-sm text-ambar">{entrega.errorLectura}</p>
      ) : null}

      <TomasEntregadas
        entregas={entrega.entregas}
        tomas={entrega.tomas}
        sinAnalizar={entrega.sinAnalizar}
        textoSinAnalizar={entrega.textoSinAnalizar}
        valorDe={entrega.valorDe}
        asignaciones={entrega.asignaciones}
        bloqueada={entrega.bloqueada}
        mostrarIdentificar={
          entrega.sinAnalizar.length > 0 && !entrega.identificando && !entrega.subiendo
        }
        identificarDesactivado={entrega.ocupado || entrega.lanzandoIdentificacion}
        alCambiarDestino={entrega.alCambiarDestino}
        alQuitar={entrega.alQuitar}
        alColocar={entrega.alColocar}
        alIdentificar={entrega.alIdentificar}
      />

      {entrega.mensaje ? (
        <p role="alert" className="m-0 text-sm text-ambar">{entrega.mensaje}</p>
      ) : null}
      {entrega.colocadas ? (
        <p role="status" className="m-0 text-sm text-verde">Tomas colocadas.</p>
      ) : null}
    </section>
  );
}
