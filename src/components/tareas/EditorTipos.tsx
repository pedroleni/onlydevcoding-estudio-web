"use client";

import { useState, useTransition, type FormEvent } from "react";

import { borrarTipoTarea, crearTipoTarea, editarTipoTarea } from "@/lib/acciones-tareas";
import { COLORES_TAREA } from "@/lib/colores-tareas";
import { idDesdeNombre } from "@/lib/ids";
import type { TipoTarea } from "@/lib/tipos";

const claseCampo =
  "min-h-10 w-full border border-borde bg-fondo px-3 text-texto focus-visible:outline-2 focus-visible:outline-marca";
const claseBoton =
  "inline-flex min-h-10 items-center border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-50";

function SelectorColor({
  valor,
  onCambio,
}: {
  valor: TipoTarea["color"];
  onCambio: (color: TipoTarea["color"]) => void;
}) {
  return (
    <label className="grid gap-1 text-tenue">
      Color
      <span className="flex items-center gap-2">
        <span aria-hidden="true" className="size-4 shrink-0 rounded-full" style={{ backgroundColor: valor }} />
        <select
          value={valor}
          onChange={(evento) => onCambio(evento.target.value as TipoTarea["color"])}
          className={claseCampo}
        >
          {COLORES_TAREA.map((color) => (
            <option key={color.valor} value={color.valor}>
              {color.nombre}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function FilaTipo({ tipo }: { tipo: TipoTarea }) {
  const [nombre, setNombre] = useState(tipo.nombre);
  const [color, setColor] = useState(tipo.color);
  const [orden, setOrden] = useState(String(tipo.orden));
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const resultado = await editarTipoTarea(tipo.id, {
        nombre: nombre.trim(),
        color,
        orden: Number(orden),
      });
      if (!resultado.ok) setMensaje(resultado.mensaje);
    });
  }

  function borrar() {
    if (!window.confirm(`¿Borrar el tipo «${tipo.nombre}»?`)) return;
    setMensaje(null);
    iniciar(async () => {
      const resultado = await borrarTipoTarea(tipo.id);
      if (!resultado.ok) setMensaje(resultado.mensaje);
    });
  }

  return (
    <form onSubmit={guardar} className="border border-borde bg-superficie p-4">
      <fieldset aria-label={`Tipo ${tipo.nombre}`} className="grid gap-3 text-sm md:grid-cols-[1fr_12rem_6rem_auto] md:items-end">
        <label className="grid gap-1 text-tenue">
          Nombre
          <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} className={claseCampo} />
        </label>
        <SelectorColor valor={color} onCambio={setColor} />
        <label className="grid gap-1 text-tenue">
          Orden
          <input
            type="number"
            min={0}
            max={10000}
            value={orden}
            onChange={(evento) => setOrden(evento.target.value)}
            className={claseCampo}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={pendiente} className={`${claseBoton} border-marca text-texto`}>
            Guardar
          </button>
          <button
            type="button"
            onClick={borrar}
            disabled={pendiente}
            className={`${claseBoton} border-borde text-tenue hover:text-texto`}
          >
            Borrar
          </button>
        </div>
        <p className="font-mono text-xs text-tenue md:col-span-4">{tipo.id}</p>
        {mensaje ? (
          <p role="alert" className="text-[#E5534B] md:col-span-4">
            {mensaje}
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}

function NuevoTipo({ siguienteOrden }: { siguienteOrden: number }) {
  const [nombre, setNombre] = useState("");
  const [id, setId] = useState("");
  const [idManual, setIdManual] = useState(false);
  const [color, setColor] = useState<TipoTarea["color"]>(COLORES_TAREA[0].valor);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const idFinal = idManual ? id : idDesdeNombre(nombre, 30);

  function crear(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const resultado = await crearTipoTarea({
        id: idFinal,
        nombre: nombre.trim(),
        color,
        orden: siguienteOrden,
      });
      if (resultado.ok) {
        setNombre("");
        setId("");
        setIdManual(false);
      } else {
        setMensaje(resultado.mensaje);
      }
    });
  }

  return (
    <form onSubmit={crear} className="border border-dashed border-borde p-4">
      <fieldset aria-label="Nuevo tipo" className="grid gap-3 text-sm md:grid-cols-[1fr_12rem_12rem_auto] md:items-end">
        <label className="grid gap-1 text-tenue">
          Nombre
          <input value={nombre} onChange={(evento) => setNombre(evento.target.value)} className={claseCampo} />
        </label>
        <label className="grid gap-1 text-tenue">
          Id
          <input
            value={idFinal}
            onChange={(evento) => {
              setIdManual(true);
              setId(evento.target.value);
            }}
            className={`${claseCampo} font-mono`}
          />
        </label>
        <SelectorColor valor={color} onCambio={setColor} />
        <button
          type="submit"
          disabled={pendiente || nombre.trim() === "" || idFinal === ""}
          className={`${claseBoton} border-marca bg-marca text-white`}
        >
          Crear tipo
        </button>
        {mensaje ? (
          <p role="alert" className="text-[#E5534B] md:col-span-4">
            {mensaje}
          </p>
        ) : null}
      </fieldset>
    </form>
  );
}

export function EditorTipos({ tipos }: { tipos: TipoTarea[] }) {
  const siguienteOrden = Math.min(10000, Math.max(0, ...tipos.map(({ orden }) => orden)) + 1);
  return (
    <div className="grid gap-3">
      {tipos.map((tipo) => (
        <FilaTipo key={`${tipo.id}-${tipo.nombre}-${tipo.color}-${tipo.orden}`} tipo={tipo} />
      ))}
      <NuevoTipo siguienteOrden={siguienteOrden} />
    </div>
  );
}
