"use client";

import { useId, useState, useTransition } from "react";

import {
  CamposEditorTextosRed,
  type ValoresEditorTextos,
} from "@/components/publicar/CamposEditorTextosRed";
import { guardarTextos } from "@/lib/acciones";
import { errorLimitesTextos, limiteTextoRed } from "@/lib/limites";
import type { RedVista, TextosEditables, TextosRed } from "@/lib/tipos";

function textoONull(valor: string): string | null {
  return valor.trim() === "" ? null : valor;
}

function lineasLimpias(valor: string): string[] {
  return valor
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea !== "");
}

function textosParaGuardar(valores: ValoresEditorTextos): TextosEditables {
  return {
    titulos: lineasLimpias(valores.titulos),
    descripcion: textoONull(valores.descripcion ?? ""),
    etiquetas: valores.etiquetas
      .split(",")
      .map((etiqueta) => etiqueta.trim())
      .filter((etiqueta) => etiqueta !== ""),
    texto: textoONull(valores.texto ?? ""),
    comentario_fijado: textoONull(valores.comentario_fijado ?? ""),
    ajustes: lineasLimpias(valores.ajustes),
    notas: textoONull(valores.notas ?? ""),
  };
}

function valoresIniciales(textos: TextosRed | null): ValoresEditorTextos {
  const iniciales = textos ?? {
    titulos: [],
    descripcion: null,
    etiquetas: [],
    texto: null,
    comentario_fijado: null,
    ajustes: [],
    notas: null,
  };
  return {
    titulos: iniciales.titulos.join("\n"),
    descripcion: iniciales.descripcion,
    etiquetas: iniciales.etiquetas.join(", "),
    texto: iniciales.texto,
    comentario_fijado: iniciales.comentario_fijado,
    ajustes: iniciales.ajustes.join("\n"),
    notas: iniciales.notas,
  };
}

function textosOriginales(textos: TextosRed | null): TextosEditables {
  if (textos === null) {
    return {
      titulos: [],
      descripcion: null,
      etiquetas: [],
      texto: null,
      comentario_fijado: null,
      ajustes: [],
      notas: null,
    };
  }
  return {
    titulos: textos.titulos,
    descripcion: textos.descripcion,
    etiquetas: textos.etiquetas,
    texto: textos.texto,
    comentario_fijado: textos.comentario_fijado,
    ajustes: textos.ajustes,
    notas: textos.notas,
  };
}

export function EditorTextosRed({
  curso,
  numero,
  pieza,
  red,
  textos,
  onCancelar,
  onGuardado,
}: {
  curso: string;
  numero: number;
  pieza: string;
  red: RedVista["red"];
  textos: TextosRed | null;
  onCancelar: () => void;
  onGuardado: (mensaje: string) => void;
}) {
  const prefijo = useId();
  const [valores, setValores] = useState(() => valoresIniciales(textos));
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const preparados = textosParaGuardar(valores);
  const originales = textosOriginales(textos);
  const haCambiado = JSON.stringify(preparados) !== JSON.stringify(originales);
  const excedeLimite = errorLimitesTextos(red, preparados) !== null;
  const limiteTexto = limiteTextoRed(red);
  const id = (campo: string) => `${prefijo}-${campo}`;

  function cambiar(campo: keyof ValoresEditorTextos, valor: string) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function guardar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await guardarTextos({ curso, numero, pieza, red }, preparados);
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      onGuardado(resultado.aviso ?? "Guardado. Guía del móvil regenerada");
    });
  }

  return (
    <section aria-labelledby={id("titulo-editor")} className="border border-borde bg-superficie p-5">
      <h3 id={id("titulo-editor")} className="text-lg font-semibold">Editar textos</h3>
      <div className="mt-5 grid gap-5">
        <CamposEditorTextosRed
          valores={valores}
          preparados={preparados}
          red={red}
          limiteTexto={limiteTexto}
          id={id}
          alCambiar={cambiar}
        />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-borde pt-5">
        <button
          type="button"
          disabled={pendiente}
          onClick={onCancelar}
          className="min-h-11 border border-borde px-5 text-sm font-semibold text-tenue transition-colors hover:border-texto hover:text-texto disabled:cursor-wait disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pendiente || excedeLimite || !haCambiado}
          onClick={guardar}
          className="min-h-11 bg-marca px-5 text-sm font-bold text-fondo transition-colors hover:bg-texto disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-400">{error}</p> : null}
    </section>
  );
}
