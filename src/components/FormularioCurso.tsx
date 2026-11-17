"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { borrarCurso, crearCurso } from "@/lib/acciones-tareas";
import { idDesdeNombre } from "@/lib/ids";

const claseCampo =
  "min-h-10 w-full border border-borde bg-fondo px-3 text-texto focus-visible:outline-2 focus-visible:outline-marca";
const claseBoton =
  "inline-flex min-h-10 items-center border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-50";

export function FormularioCurso() {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [id, setId] = useState("");
  const [idManual, setIdManual] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const idFinal = idManual ? id : idDesdeNombre(nombre, 40);

  function cerrar() {
    setAbierto(false);
    setNombre("");
    setId("");
    setIdManual(false);
    setMensaje(null);
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensaje(null);
    iniciar(async () => {
      const resultado = await crearCurso(idFinal, nombre.trim());
      if (resultado.ok) cerrar();
      else setMensaje(resultado.mensaje);
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${claseBoton} border-marca bg-marca text-white`}
      >
        + Curso
      </button>
    );
  }

  return (
    <form onSubmit={guardar} className="grid w-full gap-3 border border-borde bg-superficie p-4 text-sm md:grid-cols-[1fr_14rem_auto] md:items-end">
      <label className="grid gap-1 text-tenue">
        Nombre
        <input
          autoFocus
          value={nombre}
          onChange={(evento) => setNombre(evento.target.value)}
          className={claseCampo}
        />
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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cerrar}
          className={`${claseBoton} border-borde text-tenue hover:text-texto`}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pendiente || nombre.trim() === "" || idFinal === ""}
          className={`${claseBoton} border-marca bg-marca text-white`}
        >
          Dar de alta
        </button>
      </div>
      {mensaje ? (
        <p role="alert" className="text-[#E5534B] md:col-span-3">
          {mensaje}
        </p>
      ) : null}
    </form>
  );
}

export function BotonBorrarCurso({ curso, nombre }: { curso: string; nombre: string }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function borrar() {
    if (!window.confirm(`¿Borrar el curso «${nombre}»? Solo se borra de la app.`)) return;
    setMensaje(null);
    iniciar(async () => {
      const resultado = await borrarCurso(curso);
      if (resultado.ok) router.push("/cursos");
      else setMensaje(resultado.mensaje);
    });
  }

  return (
    <div className="grid justify-items-start gap-2">
      <button
        type="button"
        onClick={borrar}
        disabled={pendiente}
        className={`${claseBoton} border-borde text-tenue hover:text-texto`}
      >
        Borrar el curso
      </button>
      {mensaje ? (
        <p role="alert" className="text-sm text-[#E5534B]">
          {mensaje}
        </p>
      ) : null}
    </div>
  );
}
