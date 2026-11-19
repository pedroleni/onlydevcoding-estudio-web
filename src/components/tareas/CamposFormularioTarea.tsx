import type { RefObject } from "react";

import { REDES } from "@/lib/curso";
import type { Curso, TipoTarea } from "@/lib/tipos";

export type OpcionFormularioTarea = { valor: string; etiqueta: string };

export type ControlCamposTarea = {
  texto: string;
  setTexto: (valor: string) => void;
  dia: string;
  setDia: (valor: string) => void;
  hora: string;
  setHora: (valor: string) => void;
  tipo: string;
  setTipo: (valor: string) => void;
  curso: string;
  numero: string;
  pieza: string;
  red: string;
  lecciones: OpcionFormularioTarea[];
  piezas: OpcionFormularioTarea[];
  cursoEnDisco: boolean;
  enlaceRoto: boolean;
  largo: number;
  elegirCurso: (valor: string) => void;
  elegirLeccion: (valor: string) => void;
  elegirPieza: (valor: string) => void;
  setRed: (valor: string) => void;
};

const claseCampo =
  "min-h-10 w-full border border-borde bg-fondo px-3 text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-50";

export const claseBotonTarea =
  "inline-flex min-h-10 items-center border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-50";

export function CamposBasicosTarea({
  id,
  tipos,
  control,
  textoRef,
  limiteTexto,
}: {
  id: string;
  tipos: TipoTarea[];
  control: ControlCamposTarea;
  textoRef: RefObject<HTMLInputElement | null>;
  limiteTexto: number;
}) {
  return (
    <>
      <div className="grid gap-1">
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${id}-texto`} className="text-tenue">Texto</label>
          <span className={`font-mono text-xs ${control.largo > limiteTexto ? "text-[#E5534B]" : "text-tenue"}`}>
            {control.largo}/{limiteTexto}
          </span>
        </div>
        <input
          ref={textoRef}
          id={`${id}-texto`}
          value={control.texto}
          onChange={(evento) => control.setTexto(evento.target.value)}
          className={claseCampo}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1 text-tenue">
          <label htmlFor={`${id}-fecha`}>Fecha (vacía: sin día)</label>
          <input
            id={`${id}-fecha`}
            type="date"
            value={control.dia}
            onChange={(evento) => control.setDia(evento.target.value)}
            className={claseCampo}
          />
        </div>
        <div className="grid gap-1 text-tenue">
          <label htmlFor={`${id}-hora`}>Hora</label>
          <input
            id={`${id}-hora`}
            type="time"
            value={control.hora}
            onChange={(evento) => control.setHora(evento.target.value)}
            className={claseCampo}
          />
        </div>
      </div>
      <div className="grid gap-1 text-tenue">
        <label htmlFor={`${id}-tipo`}>Tipo</label>
        <select
          id={`${id}-tipo`}
          value={control.tipo}
          onChange={(evento) => control.setTipo(evento.target.value)}
          className={claseCampo}
        >
          {tipos.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
          ))}
        </select>
      </div>
    </>
  );
}

export function CamposEnlaceTarea({
  id,
  cursos,
  control,
}: {
  id: string;
  cursos: Curso[];
  control: ControlCamposTarea;
}) {
  return (
    <fieldset className="grid gap-3 border border-borde p-3">
      <legend className="px-1 text-tenue">Enlace (opcional)</legend>
      {control.enlaceRoto ? (
        <p className="text-[#E8A33D]">
          El enlace anterior ya no existe. Elige otro o guarda la tarea sin enlace.
        </p>
      ) : null}
      <div className="grid gap-1 text-tenue">
        <label htmlFor={`${id}-curso`}>Curso</label>
        <select
          id={`${id}-curso`}
          value={control.curso}
          onChange={(evento) => control.elegirCurso(evento.target.value)}
          className={claseCampo}
        >
          <option value="">Sin enlace</option>
          {cursos.map((opcion) => (
            <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1 text-tenue">
        <label htmlFor={`${id}-leccion`}>Lección</label>
        <select
          id={`${id}-leccion`}
          value={control.numero}
          onChange={(evento) => control.elegirLeccion(evento.target.value)}
          disabled={!control.cursoEnDisco || control.lecciones.length === 0}
          className={claseCampo}
        >
          <option value="">Todo el curso</option>
          {control.lecciones.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1 text-tenue">
        <label htmlFor={`${id}-pieza`}>Pieza</label>
        <select
          id={`${id}-pieza`}
          value={control.pieza}
          onChange={(evento) => control.elegirPieza(evento.target.value)}
          disabled={!control.numero || control.piezas.length === 0}
          className={claseCampo}
        >
          <option value="">Toda la lección</option>
          {control.piezas.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-1 text-tenue">
        <label htmlFor={`${id}-red`}>Red</label>
        <select
          id={`${id}-red`}
          value={control.red}
          onChange={(evento) => control.setRed(evento.target.value)}
          disabled={!control.pieza}
          className={claseCampo}
        >
          <option value="">Todas las redes</option>
          {REDES.map(([idRed, nombre]) => (
            <option key={idRed} value={idRed}>{nombre}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
