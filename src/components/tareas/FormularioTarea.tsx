"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";

import {
  crearTarea,
  editarTarea,
  opcionesLecciones,
  opcionesPiezas,
} from "@/lib/acciones-tareas";
import { REDES } from "@/lib/curso";
import type { Curso, EnlaceTarea, TareaNueva, TareaVista, TipoTarea } from "@/lib/tipos";

const LIMITE_TEXTO = 300;

const claseCampo =
  "min-h-10 w-full border border-borde bg-fondo px-3 text-texto focus-visible:outline-2 focus-visible:outline-marca disabled:opacity-50";
const claseBoton =
  "inline-flex min-h-10 items-center border px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marca disabled:opacity-50";

type Opcion = { valor: string; etiqueta: string };

function longitud(valor: string): number {
  return Array.from(valor).length;
}

function Formulario({
  titulo,
  cursos,
  tipos,
  inicial,
  fecha,
  onCerrar,
}: {
  titulo: string;
  cursos: Curso[];
  tipos: TipoTarea[];
  inicial?: TareaVista;
  fecha: string | null;
  onCerrar: () => void;
}) {
  const id = useId();
  const dialogoRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLInputElement>(null);
  const pendienteRef = useRef(false);
  const peticionLecciones = useRef(0);
  const peticionPiezas = useRef(0);
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Un enlace que ya no existe no se puede mostrar en los selectores: se empieza sin enlace y se avisa.
  const enlaceRoto =
    inicial?.enlace != null &&
    (inicial.enlace_vista?.roto === true ||
      !cursos.some(({ id: idCurso }) => idCurso === inicial.enlace?.curso));
  const enlaceInicial = enlaceRoto ? null : (inicial?.enlace ?? null);

  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [dia, setDia] = useState(inicial ? (inicial.fecha ?? "") : (fecha ?? ""));
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? tipos[0]?.id ?? "");
  const [curso, setCurso] = useState(enlaceInicial?.curso ?? "");
  const [numero, setNumero] = useState(enlaceInicial?.numero ? String(enlaceInicial.numero) : "");
  const [pieza, setPieza] = useState(enlaceInicial?.pieza ?? "");
  const [red, setRed] = useState(enlaceInicial?.red ?? "");
  const [lecciones, setLecciones] = useState<Opcion[]>([]);
  const [piezas, setPiezas] = useState<Opcion[]>([]);

  const cursoEnDisco = cursos.find(({ id: idCurso }) => idCurso === curso)?.en_disco === true;

  async function cargarLecciones(idCurso: string) {
    const peticion = ++peticionLecciones.current;
    const opciones = await opcionesLecciones(idCurso);
    if (peticion !== peticionLecciones.current) return;
    setLecciones(
      opciones.map(({ numero: n, titulo: t }) => ({ valor: String(n), etiqueta: `${n} · ${t}` })),
    );
  }

  async function cargarPiezas(idCurso: string, n: number) {
    const peticion = ++peticionPiezas.current;
    const opciones = await opcionesPiezas(idCurso, n);
    if (peticion !== peticionPiezas.current) return;
    setPiezas(opciones.map(({ id: idPieza, titulo: t }) => ({ valor: idPieza, etiqueta: t })));
  }

  useEffect(() => {
    pendienteRef.current = pendiente;
  }, [pendiente]);

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    textoRef.current?.focus();

    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !pendienteRef.current) {
        evento.preventDefault();
        onCerrar();
        return;
      }
      if (evento.key !== "Tab" || !dialogoRef.current) return;
      const enfocables = Array.from(
        dialogoRef.current.querySelectorAll<HTMLElement>(
          "input:not([disabled]), select:not([disabled]), button:not([disabled])",
        ),
      );
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const dentro = dialogoRef.current.contains(document.activeElement);
      if (evento.shiftKey && (document.activeElement === primero || !dentro)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      anterior?.focus();
    };
    // Solo al abrir y cerrar el diálogo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const enlace = enlaceInicial;
    if (!enlace || !cursos.find(({ id: idCurso }) => idCurso === enlace.curso)?.en_disco) return;
    void cargarLecciones(enlace.curso);
    if (enlace.numero) void cargarPiezas(enlace.curso, enlace.numero);
    // Solo al abrir: después, cada cambio de selector carga lo suyo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function elegirCurso(valor: string) {
    setCurso(valor);
    setNumero("");
    setPieza("");
    setRed("");
    setLecciones([]);
    setPiezas([]);
    peticionPiezas.current++;
    if (cursos.find(({ id: idCurso }) => idCurso === valor)?.en_disco) {
      void cargarLecciones(valor);
    } else {
      peticionLecciones.current++;
    }
  }

  function elegirLeccion(valor: string) {
    setNumero(valor);
    setPieza("");
    setRed("");
    setPiezas([]);
    if (valor) void cargarPiezas(curso, Number(valor));
    else peticionPiezas.current++;
  }

  function elegirPieza(valor: string) {
    setPieza(valor);
    setRed("");
  }

  const largo = longitud(texto);
  const recortado = texto.trim();
  const valido = recortado !== "" && longitud(recortado) <= LIMITE_TEXTO && tipo !== "";

  function enlaceElegido(): EnlaceTarea | null {
    if (!curso) return null;
    const enlace: EnlaceTarea = { curso };
    if (numero) {
      enlace.numero = Number(numero);
      if (pieza) {
        enlace.pieza = pieza;
        if (red) enlace.red = red as EnlaceTarea["red"];
      }
    }
    return enlace;
  }

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido) return;
    const nueva: TareaNueva = {
      fecha: dia || null,
      hora: hora || null,
      texto: recortado,
      tipo,
      enlace: enlaceElegido(),
    };
    setError(null);
    iniciar(async () => {
      const resultado = inicial ? await editarTarea(inicial.id, nueva) : await crearTarea(nueva);
      if (resultado.ok) onCerrar();
      else setError(resultado.mensaje);
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-borde bg-superficie p-5 md:p-6"
      >
        <h2 id={`${id}-titulo`} className="text-xl font-semibold">
          {titulo}
        </h2>
        <form onSubmit={guardar} className="mt-5 grid gap-4 text-sm">
          <div className="grid gap-1">
            <div className="flex items-baseline justify-between">
              <label htmlFor={`${id}-texto`} className="text-tenue">
                Texto
              </label>
              <span
                className={`font-mono text-xs ${largo > LIMITE_TEXTO ? "text-[#E5534B]" : "text-tenue"}`}
              >
                {largo}/{LIMITE_TEXTO}
              </span>
            </div>
            <input
              ref={textoRef}
              id={`${id}-texto`}
              value={texto}
              onChange={(evento) => setTexto(evento.target.value)}
              className={claseCampo}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-fecha`}>Fecha (vacía: sin día)</label>
              <input
                id={`${id}-fecha`}
                type="date"
                value={dia}
                onChange={(evento) => setDia(evento.target.value)}
                className={claseCampo}
              />
            </div>
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-hora`}>Hora</label>
              <input
                id={`${id}-hora`}
                type="time"
                value={hora}
                onChange={(evento) => setHora(evento.target.value)}
                className={claseCampo}
              />
            </div>
          </div>

          <div className="grid gap-1 text-tenue">
            <label htmlFor={`${id}-tipo`}>Tipo</label>
            <select
              id={`${id}-tipo`}
              value={tipo}
              onChange={(evento) => setTipo(evento.target.value)}
              className={claseCampo}
            >
              {tipos.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.nombre}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="grid gap-3 border border-borde p-3">
            <legend className="px-1 text-tenue">Enlace (opcional)</legend>
            {enlaceRoto ? (
              <p className="text-[#E8A33D]">
                El enlace anterior ya no existe. Elige otro o guarda la tarea sin enlace.
              </p>
            ) : null}
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-curso`}>Curso</label>
              <select
                id={`${id}-curso`}
                value={curso}
                onChange={(evento) => elegirCurso(evento.target.value)}
                className={claseCampo}
              >
                <option value="">Sin enlace</option>
                {cursos.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-leccion`}>Lección</label>
              <select
                id={`${id}-leccion`}
                value={numero}
                onChange={(evento) => elegirLeccion(evento.target.value)}
                disabled={!cursoEnDisco || lecciones.length === 0}
                className={claseCampo}
              >
                <option value="">Todo el curso</option>
                {lecciones.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-pieza`}>Pieza</label>
              <select
                id={`${id}-pieza`}
                value={pieza}
                onChange={(evento) => elegirPieza(evento.target.value)}
                disabled={!numero || piezas.length === 0}
                className={claseCampo}
              >
                <option value="">Toda la lección</option>
                {piezas.map((opcion) => (
                  <option key={opcion.valor} value={opcion.valor}>
                    {opcion.etiqueta}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1 text-tenue">
              <label htmlFor={`${id}-red`}>Red</label>
              <select
                id={`${id}-red`}
                value={red}
                onChange={(evento) => setRed(evento.target.value)}
                disabled={!pieza}
                className={claseCampo}
              >
                <option value="">Todas las redes</option>
                {REDES.map(([idRed, nombre]) => (
                  <option key={idRed} value={idRed}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {error ? (
            <p role="alert" className="text-[#E5534B]">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className={`${claseBoton} border-borde text-tenue hover:text-texto`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!valido || pendiente}
              className={`${claseBoton} border-marca bg-marca text-white hover:bg-marca/85`}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BotonNuevaTarea({
  cursos,
  tipos,
  fecha,
}: {
  cursos: Curso[];
  tipos: TipoTarea[];
  fecha: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`${claseBoton} border-marca bg-marca text-white hover:bg-marca/85`}
      >
        + Tarea
      </button>
      {abierto ? (
        <Formulario
          titulo="Nueva tarea"
          cursos={cursos}
          tipos={tipos}
          fecha={fecha}
          onCerrar={() => setAbierto(false)}
        />
      ) : null}
    </>
  );
}

export function BotonEditarTarea({
  tarea,
  cursos,
  tipos,
}: {
  tarea: TareaVista;
  cursos: Curso[];
  tipos: TipoTarea[];
}) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label={`Editar «${tarea.texto}»`}
        className="min-h-9 border border-borde px-3 text-xs text-tenue hover:text-texto focus-visible:outline-2 focus-visible:outline-marca"
      >
        Editar
      </button>
      {abierto ? (
        <Formulario
          titulo="Editar tarea"
          cursos={cursos}
          tipos={tipos}
          inicial={tarea}
          fecha={tarea.fecha}
          onCerrar={() => setAbierto(false)}
        />
      ) : null}
    </>
  );
}
