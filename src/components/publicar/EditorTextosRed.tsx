"use client";

import { useId, useState, useTransition } from "react";

import { Contador } from "@/components/publicar/Contador";
import { guardarTextos } from "@/lib/acciones";
import {
  errorLimitesTextos,
  LIMITES_PUBLICACION,
  limiteTextoRed,
} from "@/lib/limites";
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

function textosParaGuardar(
  valores: Omit<TextosEditables, "titulos" | "etiquetas" | "ajustes"> & {
    titulos: string;
    etiquetas: string;
    ajustes: string;
  },
): TextosEditables {
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

const claseCampo =
  "mt-2 min-h-11 w-full border border-borde bg-carbon px-3 py-2 text-sm leading-6 text-texto placeholder:text-tenue";

function CabeceraCampo({
  htmlFor,
  children,
  contador,
}: {
  htmlFor: string;
  children: React.ReactNode;
  contador?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </label>
      {contador}
    </div>
  );
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
  const iniciales = textos ?? {
    titulos: [],
    descripcion: null,
    etiquetas: [],
    texto: null,
    comentario_fijado: null,
    ajustes: [],
    notas: null,
  };
  const [valores, setValores] = useState({
    titulos: iniciales.titulos.join("\n"),
    descripcion: iniciales.descripcion,
    etiquetas: iniciales.etiquetas.join(", "),
    texto: iniciales.texto,
    comentario_fijado: iniciales.comentario_fijado,
    ajustes: iniciales.ajustes.join("\n"),
    notas: iniciales.notas,
  });
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const preparados = textosParaGuardar(valores);
  const originales: TextosEditables = {
    titulos: iniciales.titulos,
    descripcion: iniciales.descripcion,
    etiquetas: iniciales.etiquetas,
    texto: iniciales.texto,
    comentario_fijado: iniciales.comentario_fijado,
    ajustes: iniciales.ajustes,
    notas: iniciales.notas,
  };
  const haCambiado = JSON.stringify(preparados) !== JSON.stringify(originales);
  const excedeLimite = errorLimitesTextos(red, preparados) !== null;
  const limiteTexto = limiteTextoRed(red);
  const lineasTitulos = valores.titulos.split(/\r?\n/);
  const lineasAjustes = valores.ajustes.split(/\r?\n/);

  function cambiar(
    campo:
      | "titulos"
      | "descripcion"
      | "etiquetas"
      | "texto"
      | "comentario_fijado"
      | "ajustes"
      | "notas",
    valor: string,
  ) {
    setValores((actuales) => ({ ...actuales, [campo]: valor }));
  }

  function guardar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await guardarTextos(
        curso,
        numero,
        pieza,
        red,
        preparados,
      );
      if (!resultado.ok) {
        setError(resultado.mensaje);
        return;
      }
      onGuardado(
        resultado.aviso ?? "Guardado. Guía del móvil regenerada",
      );
    });
  }

  const id = (campo: string) => `${prefijo}-${campo}`;

  return (
    <section
      aria-labelledby={id("titulo-editor")}
      className="border border-borde bg-superficie p-5"
    >
      <h3 id={id("titulo-editor")} className="text-lg font-semibold">
        Editar textos
      </h3>

      <div className="mt-5 grid gap-5">
        <div>
          <CabeceraCampo
            htmlFor={id("titulos")}
            contador={
              red === "youtube" ? (
                <span className="flex flex-wrap justify-end gap-2">
                  {lineasTitulos
                    .filter((titulo) => titulo.trim() !== "")
                    .map((titulo, indice) => (
                      <Contador
                        key={indice}
                        valor={titulo.trim()}
                        limite={LIMITES_PUBLICACION.tituloYoutube}
                      />
                    ))}
                </span>
              ) : undefined
            }
          >
            Títulos, uno por línea
          </CabeceraCampo>
          <textarea
            id={id("titulos")}
            value={valores.titulos}
            onChange={(evento) => cambiar("titulos", evento.target.value)}
            rows={4}
            className={claseCampo}
          />
          <p className="mt-2 text-xs text-tenue">
            El primer título será el recomendado.
          </p>
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("descripcion")}
            contador={
              red === "youtube" ? (
                <Contador
                  valor={valores.descripcion ?? ""}
                  limite={LIMITES_PUBLICACION.descripcionYoutube}
                />
              ) : undefined
            }
          >
            Descripción
          </CabeceraCampo>
          <textarea
            id={id("descripcion")}
            value={valores.descripcion ?? ""}
            onChange={(evento) => cambiar("descripcion", evento.target.value)}
            rows={8}
            className={claseCampo}
          />
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("etiquetas")}
            contador={
              red === "youtube" ? (
                <Contador
                  valor={preparados.etiquetas.join(", ")}
                  limite={LIMITES_PUBLICACION.etiquetasYoutube}
                />
              ) : undefined
            }
          >
            Etiquetas separadas por comas
          </CabeceraCampo>
          <input
            id={id("etiquetas")}
            type="text"
            value={valores.etiquetas}
            onChange={(evento) => cambiar("etiquetas", evento.target.value)}
            className={claseCampo}
          />
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("texto")}
            contador={
              limiteTexto === null ? undefined : (
                <Contador valor={valores.texto ?? ""} limite={limiteTexto} />
              )
            }
          >
            Texto
          </CabeceraCampo>
          <textarea
            id={id("texto")}
            value={valores.texto ?? ""}
            onChange={(evento) => cambiar("texto", evento.target.value)}
            rows={8}
            className={claseCampo}
          />
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("comentario")}
            contador={
              <Contador
                valor={valores.comentario_fijado ?? ""}
                limite={LIMITES_PUBLICACION.comentarioFijado}
              />
            }
          >
            Comentario fijado
          </CabeceraCampo>
          <textarea
            id={id("comentario")}
            value={valores.comentario_fijado ?? ""}
            onChange={(evento) =>
              cambiar("comentario_fijado", evento.target.value)
            }
            rows={6}
            className={claseCampo}
          />
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("ajustes")}
            contador={
              <Contador
                valor={preparados.ajustes.length}
                limite={LIMITES_PUBLICACION.maximoLineas}
                unidad="líneas"
              />
            }
          >
            Ajustes, uno por línea
          </CabeceraCampo>
          <textarea
            id={id("ajustes")}
            value={valores.ajustes}
            onChange={(evento) => cambiar("ajustes", evento.target.value)}
            rows={6}
            className={claseCampo}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {lineasAjustes
              .filter((linea) => linea.trim() !== "")
              .map((linea, indice) => (
                <Contador
                  key={indice}
                  valor={linea.trim()}
                  limite={LIMITES_PUBLICACION.caracteresPorLinea}
                />
              ))}
          </div>
        </div>

        <div>
          <CabeceraCampo
            htmlFor={id("notas")}
            contador={
              <Contador
                valor={valores.notas ?? ""}
                limite={LIMITES_PUBLICACION.notas}
              />
            }
          >
            Notas
          </CabeceraCampo>
          <textarea
            id={id("notas")}
            value={valores.notas ?? ""}
            onChange={(evento) => cambiar("notas", evento.target.value)}
            rows={6}
            className={claseCampo}
          />
        </div>
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
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
