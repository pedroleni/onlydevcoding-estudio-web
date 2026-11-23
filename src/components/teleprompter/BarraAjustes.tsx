import { useId, type Ref } from "react";

import { LETRA, RITMO, TAMANOS_PREVIA, type Preferencias } from "@/lib/teleprompter/preferencias";
import type { Microfono } from "@/lib/teleprompter/microfonos";
import { textoLegible } from "@/lib/texto-legible";

export type OpcionLeccion = {
  curso: string;
  numero: number;
  titulo: string;
  nombreCurso: string;
};

export const valorLeccion = ({ curso, numero }: { curso: string; numero: number }) =>
  `${curso}/${numero}`;

const NOMBRES_PREVIA: Record<Preferencias["tamPrevia"], string> = {
  0: "Oculta",
  320: "Pequeña",
  440: "Mediana",
  600: "Grande",
};

const AJUSTE = "flex min-w-0 items-center gap-2 text-sm text-tenue";
const SELECTOR =
  "min-w-0 rounded-lg border border-borde bg-superficie px-2.5 py-2 text-texto";

function AjusteMicrofono({
  id,
  micro,
  micros,
  desactivado,
  microDelPortatil,
  alCambiar,
  alProbar,
}: {
  id: string;
  micro: string;
  micros: Microfono[];
  desactivado: boolean;
  microDelPortatil: boolean;
  alCambiar: (micro: string) => void;
  alProbar: () => void;
}) {
  const microConocido = micro === "" || micros.some(({ id: valor }) => valor === micro);

  return (
    <>
      <div className={AJUSTE}>
        <label htmlFor={id}>Micrófono</label>
        <select
          id={id}
          value={microConocido ? micro : ""}
          onChange={(evento) => alCambiar(evento.target.value)}
          className={`${SELECTOR} max-w-[12rem]`}
        >
          <option value="">Predeterminado</option>
          {micros.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>
              {opcion.nombre}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={desactivado}
          onClick={alProbar}
          className="rounded-lg border border-borde px-3 py-2 font-semibold text-texto disabled:opacity-40"
        >
          Probar micrófono
        </button>
      </div>
      {microDelPortatil ? (
        <p className="m-0 text-sm font-medium text-ambar">
          Vas a grabar con el micrófono del portátil
        </p>
      ) : null}
    </>
  );
}

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
        className={`${SELECTOR} flex-1 disabled:opacity-40 sm:max-w-[18rem]`}
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
  alProbarMicro,
  microDesactivado,
  microDelPortatil,
  nivelRef,
  tamPrevia,
  alCambiarTamPrevia,
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
  alProbarMicro: () => void;
  microDesactivado: boolean;
  microDelPortatil: boolean;
  nivelRef: Ref<HTMLSpanElement>;
  tamPrevia: Preferencias["tamPrevia"];
  alCambiarTamPrevia: (tam: Preferencias["tamPrevia"]) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-[14px] gap-y-2 border-b border-borde px-4 py-2 md:px-6">
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
          className="w-24 accent-marca"
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
          className="w-24 accent-marca"
        />
      </div>

      <AjusteMicrofono
        id={`${id}-micro`}
        micro={micro}
        micros={micros}
        desactivado={microDesactivado}
        microDelPortatil={microDelPortatil}
        alCambiar={alCambiarMicro}
        alProbar={alProbarMicro}
      />

      <div className={AJUSTE}>
        <span>Nivel</span>
        <span
          ref={nivelRef}
          className="group block h-2.5 w-[100px] overflow-hidden rounded-[5px] bg-borde"
        >
          <i className="block h-full w-0 bg-verde transition-[width] duration-[60ms] ease-linear group-[.alto]:bg-rojo" />
        </span>
      </div>

      <div className={AJUSTE}>
        <label htmlFor={`${id}-previa`}>Vista previa</label>
        <select
          id={`${id}-previa`}
          value={tamPrevia}
          onChange={(evento) => {
            const tam = TAMANOS_PREVIA.find((valor) => valor === Number(evento.target.value));
            if (tam !== undefined) alCambiarTamPrevia(tam);
          }}
          className={SELECTOR}
        >
          {TAMANOS_PREVIA.map((tam) => (
            <option key={tam} value={tam}>
              {NOMBRES_PREVIA[tam]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
