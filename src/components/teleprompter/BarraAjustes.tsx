import { useId, type Ref } from "react";

import { LETRA, RITMO } from "@/lib/teleprompter/preferencias";
import { textoLegible } from "@/lib/texto-legible";

export type OpcionLeccion = {
  curso: string;
  numero: number;
  titulo: string;
  nombreCurso: string;
};

export type Microfono = { id: string; nombre: string };

export const valorLeccion = ({ curso, numero }: { curso: string; numero: number }) =>
  `${curso}/${numero}`;

const AJUSTE = "flex min-w-0 items-center gap-2 text-sm text-tenue";
const SELECTOR =
  "min-w-0 rounded-lg border border-borde bg-superficie px-2.5 py-2 text-texto";

export function SelectorLeccion({
  lecciones,
  leccion,
  alCambiarLeccion,
  desactivado = false,
}: {
  lecciones: OpcionLeccion[];
  leccion: string;
  alCambiarLeccion: (valor: string) => void;
  desactivado?: boolean;
}) {
  const id = useId();
  const conocida = lecciones.some((opcion) => valorLeccion(opcion) === leccion);

  return (
    <div className={`${AJUSTE} w-full sm:w-auto`}>
      <label htmlFor={id}>Lección</label>
      <select
        id={id}
        value={conocida ? leccion : ""}
        disabled={desactivado}
        onChange={(evento) => alCambiarLeccion(evento.target.value)}
        className={`${SELECTOR} flex-1 disabled:opacity-40 sm:max-w-[24rem]`}
      >
        {conocida ? null : (
          <option value="" disabled>
            Elige una lección
          </option>
        )}
        {lecciones.map((opcion) => (
          <option key={valorLeccion(opcion)} value={valorLeccion(opcion)}>
            {`${opcion.nombreCurso} · ${opcion.numero}: ${textoLegible(opcion.titulo)}`}
          </option>
        ))}
      </select>
    </div>
  );
}

export function BarraAjustes({
  lecciones,
  leccion,
  alCambiarLeccion,
  bloqueada,
  ritmo,
  alCambiarRitmo,
  letra,
  alCambiarLetra,
  micro,
  micros,
  alCambiarMicro,
  nivelRef,
}: {
  lecciones: OpcionLeccion[];
  leccion: string;
  alCambiarLeccion: (valor: string) => void;
  bloqueada: boolean;
  ritmo: number;
  alCambiarRitmo: (ritmo: number) => void;
  letra: number;
  alCambiarLetra: (letra: number) => void;
  micro: string;
  micros: Microfono[];
  alCambiarMicro: (micro: string) => void;
  nivelRef: Ref<HTMLSpanElement>;
}) {
  const id = useId();
  const microConocido = micro === "" || micros.some(({ id: valor }) => valor === micro);

  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3 border-b border-borde px-4 py-3.5 md:px-6">
      <SelectorLeccion
        lecciones={lecciones}
        leccion={leccion}
        alCambiarLeccion={alCambiarLeccion}
        desactivado={bloqueada}
      />

      <div className={AJUSTE}>
        <label htmlFor={`${id}-ritmo`}>Ritmo</label>
        <input
          id={`${id}-ritmo`}
          type="range"
          min={RITMO.min}
          max={RITMO.max}
          step={RITMO.paso}
          value={ritmo}
          onChange={(evento) => alCambiarRitmo(Number(evento.target.value))}
          className="w-28 accent-marca"
        />
        <span className="min-w-[3.5ch] font-mono text-texto">{ritmo}</span>
        <span>ppm</span>
      </div>

      <div className={AJUSTE}>
        <label htmlFor={`${id}-letra`}>Letra</label>
        <input
          id={`${id}-letra`}
          type="range"
          min={LETRA.min}
          max={LETRA.max}
          step={LETRA.paso}
          value={letra}
          onChange={(evento) => alCambiarLetra(Number(evento.target.value))}
          className="w-28 accent-marca"
        />
      </div>

      <div className={AJUSTE}>
        <label htmlFor={`${id}-micro`}>Micrófono</label>
        <select
          id={`${id}-micro`}
          value={microConocido ? micro : ""}
          onChange={(evento) => alCambiarMicro(evento.target.value)}
          className={`${SELECTOR} max-w-[14rem]`}
        >
          <option value="">Predeterminado</option>
          {micros.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={AJUSTE}>
        <span>Nivel</span>
        <span
          ref={nivelRef}
          className="group block h-2.5 w-[140px] overflow-hidden rounded-[5px] bg-borde"
        >
          <i className="block h-full w-0 bg-verde transition-[width] duration-[60ms] ease-linear group-[.alto]:bg-rojo" />
        </span>
      </div>
    </div>
  );
}
