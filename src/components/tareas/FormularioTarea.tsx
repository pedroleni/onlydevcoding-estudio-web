"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  CamposBasicosTarea,
  CamposEnlaceTarea,
  claseBotonTarea,
  type ControlCamposTarea,
  type OpcionFormularioTarea,
} from "@/components/tareas/CamposFormularioTarea";
import { crearTarea, editarTarea, opcionesLecciones, opcionesPiezas } from "@/lib/acciones-tareas";
import type { Curso, EnlaceTarea, TareaNueva, TareaVista, TipoTarea } from "@/lib/tipos";

const LIMITE_TEXTO = 300;

function longitud(valor: string): number {
  return Array.from(valor).length;
}

function useDialogoTarea(pendiente: boolean, onCerrar: () => void) {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLInputElement>(null);
  const alPulsar = useEffectEvent((evento: KeyboardEvent) => {
    if (evento.key === "Escape" && !pendiente) {
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
  });

  useEffect(() => {
    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    textoRef.current?.focus();
    document.addEventListener("keydown", alPulsar);
    return () => {
      document.removeEventListener("keydown", alPulsar);
      anterior?.focus();
    };
  }, []);
  return { dialogoRef, textoRef };
}

function enlaceInicialValido(inicial: TareaVista | undefined, cursos: Curso[]) {
  const enlaceRoto =
    inicial?.enlace != null &&
    (inicial.enlace_vista?.roto === true ||
      !cursos.some(({ id }) => id === inicial.enlace?.curso));
  return { enlaceRoto, enlaceInicial: enlaceRoto ? null : (inicial?.enlace ?? null) };
}

function useEnlaceTarea(cursos: Curso[], inicial?: TareaVista) {
  const { enlaceRoto, enlaceInicial } = enlaceInicialValido(inicial, cursos);
  const [curso, setCurso] = useState(enlaceInicial?.curso ?? "");
  const [numero, setNumero] = useState(enlaceInicial?.numero ? String(enlaceInicial.numero) : "");
  const [pieza, setPieza] = useState(enlaceInicial?.pieza ?? "");
  const [red, setRed] = useState(enlaceInicial?.red ?? "");
  const [lecciones, setLecciones] = useState<OpcionFormularioTarea[]>([]);
  const [piezas, setPiezas] = useState<OpcionFormularioTarea[]>([]);
  const peticionLecciones = useRef(0);
  const peticionPiezas = useRef(0);

  async function cargarLecciones(idCurso: string) {
    const peticion = ++peticionLecciones.current;
    const opciones = await opcionesLecciones(idCurso);
    if (peticion !== peticionLecciones.current) return;
    setLecciones(opciones.map(({ numero: n, titulo }) => ({ valor: String(n), etiqueta: `${n} · ${titulo}` })));
  }

  async function cargarPiezas(idCurso: string, n: number) {
    const peticion = ++peticionPiezas.current;
    const opciones = await opcionesPiezas(idCurso, n);
    if (peticion !== peticionPiezas.current) return;
    setPiezas(opciones.map(({ id, titulo }) => ({ valor: id, etiqueta: titulo })));
  }

  const cargarInicial = useEffectEvent(() => {
    if (!enlaceInicial) return;
    if (!cursos.find(({ id }) => id === enlaceInicial.curso)?.en_disco) return;
    void cargarLecciones(enlaceInicial.curso);
    if (enlaceInicial.numero) void cargarPiezas(enlaceInicial.curso, enlaceInicial.numero);
  });
  useEffect(() => {
    cargarInicial();
  }, []);

  function elegirCurso(valor: string) {
    setCurso(valor);
    setNumero("");
    setPieza("");
    setRed("");
    setLecciones([]);
    setPiezas([]);
    peticionPiezas.current++;
    if (cursos.find(({ id }) => id === valor)?.en_disco) void cargarLecciones(valor);
    else peticionLecciones.current++;
  }

  function elegirLeccion(valor: string) {
    setNumero(valor);
    setPieza("");
    setRed("");
    setPiezas([]);
    if (valor) void cargarPiezas(curso, Number(valor));
    else peticionPiezas.current++;
  }

  function enlaceElegido(): EnlaceTarea | null {
    if (!curso) return null;
    const enlace: EnlaceTarea = { curso };
    if (!numero) return enlace;
    enlace.numero = Number(numero);
    if (!pieza) return enlace;
    enlace.pieza = pieza;
    if (red) enlace.red = red as EnlaceTarea["red"];
    return enlace;
  }

  const elegirPieza = (valor: string) => {
    setPieza(valor);
    setRed("");
  };
  const cursoEnDisco = cursos.find(({ id }) => id === curso)?.en_disco === true;
  return {
    curso, numero, pieza, red, setRed, lecciones, piezas, enlaceRoto, cursoEnDisco,
    elegirCurso, elegirLeccion, elegirPieza, enlaceElegido,
  };
}

function useFormularioTarea({
  cursos,
  tipos,
  inicial,
  fecha,
  onCerrar,
}: {
  cursos: Curso[];
  tipos: TipoTarea[];
  inicial?: TareaVista;
  fecha: string | null;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState(inicial?.texto ?? "");
  const [dia, setDia] = useState(inicial ? (inicial.fecha ?? "") : (fecha ?? ""));
  const [hora, setHora] = useState(inicial?.hora ?? "");
  const [tipo, setTipo] = useState(inicial?.tipo ?? tipos[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const enlace = useEnlaceTarea(cursos, inicial);
  const largo = longitud(texto);
  const recortado = texto.trim();
  const valido = recortado !== "" && longitud(recortado) <= LIMITE_TEXTO && tipo !== "";

  function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!valido) return;
    const nueva: TareaNueva = {
      fecha: dia || null,
      hora: hora || null,
      texto: recortado,
      tipo,
      enlace: enlace.enlaceElegido(),
    };
    setError(null);
    iniciar(async () => {
      const resultado = inicial ? await editarTarea(inicial.id, nueva) : await crearTarea(nueva);
      if (resultado.ok) onCerrar();
      else setError(resultado.mensaje);
    });
  }

  return {
    texto, setTexto, dia, setDia, hora, setHora, tipo, setTipo,
    error, pendiente, largo, valido, guardar, ...enlace,
  };
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
  const control = useFormularioTarea({ cursos, tipos, inicial, fecha, onCerrar });
  const { dialogoRef, textoRef } = useDialogoTarea(control.pendiente, onCerrar);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-titulo`}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto border border-borde bg-superficie p-5 md:p-6"
      >
        <h2 id={`${id}-titulo`} className="text-xl font-semibold">{titulo}</h2>
        <form onSubmit={control.guardar} className="mt-5 grid gap-4 text-sm">
          <CamposBasicosTarea
            id={id}
            tipos={tipos}
            control={control satisfies ControlCamposTarea}
            textoRef={textoRef}
            limiteTexto={LIMITE_TEXTO}
          />
          <CamposEnlaceTarea id={id} cursos={cursos} control={control} />
          {control.error ? <p role="alert" className="text-[#E5534B]">{control.error}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCerrar}
              className={`${claseBotonTarea} border-borde text-tenue hover:text-texto`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!control.valido || control.pendiente}
              className={`${claseBotonTarea} border-marca bg-marca text-white hover:bg-marca/85`}
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
        className={`${claseBotonTarea} border-marca bg-marca text-white hover:bg-marca/85`}
      >
        + Tarea
      </button>
      {abierto ? (
        <Formulario titulo="Nueva tarea" cursos={cursos} tipos={tipos} fecha={fecha} onCerrar={() => setAbierto(false)} />
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
