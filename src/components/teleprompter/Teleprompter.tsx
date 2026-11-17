"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  BarraAjustes,
  SelectorLeccion,
  valorLeccion,
  type Microfono,
  type OpcionLeccion,
} from "@/components/teleprompter/BarraAjustes";
import { BarraEscenas } from "@/components/teleprompter/BarraEscenas";
import { PieControles } from "@/components/teleprompter/PieControles";
import { TextoConRitmo } from "@/components/teleprompter/TextoConRitmo";
import { urlMedio } from "@/lib/medios";
import {
  abrirMicro,
  aWav,
  grabar,
  medirNivel,
  subirToma,
  type Grabacion,
} from "@/lib/teleprompter/grabadora";
import {
  guardarPreferencias,
  leerPreferencias,
  usePreferencias,
} from "@/lib/teleprompter/preferencias";
import { calcularPlan, mmss, type Plan } from "@/lib/teleprompter/ritmo";
import { textoLegible } from "@/lib/texto-legible";
import type {
  EscenaTeleprompter,
  Teleprompter as DatosTeleprompter,
  TomaGuardada,
} from "@/lib/tipos";

export type { OpcionLeccion };

type Seleccion = { curso: string; numero: number };
type Aviso = { texto: string; sub: string };
type Cuenta = [texto: string, sub: string, ms: number];

const urlTeleprompter = ({ curso, numero }: Seleccion) =>
  `/teleprompter?curso=${encodeURIComponent(curso)}&leccion=${numero}`;

const mensaje = (error: unknown) => (error instanceof Error ? error.message : String(error));

const planDe = (escena: EscenaTeleprompter, ritmo: number): Plan =>
  calcularPlan(
    escena.cues.map((cue) => ({ texto: cue.texto, pausa: cue.pausa ?? 0 })),
    ritmo,
  );

function estadoInicial(escena: EscenaTeleprompter | undefined, grabada: boolean): string {
  if (!escena) return "Listo.";
  if (escena.modo === "voz") {
    return grabada
      ? `Ya grabada: ${escena.id}.wav (puedes repetirla).`
      : "Pulsa Grabar cuando estés listo.";
  }
  return "Pulsa Empezar y dale a grabar en tu cámara durante la cuenta atrás.";
}

function ponerTexto(elemento: HTMLElement | null, texto: string) {
  if (!elemento) return;
  if (elemento.firstChild) elemento.firstChild.nodeValue = texto;
  else elemento.textContent = texto;
}

// Todo lo que cambia en cada fotograma o pertenece al navegador vive fuera del estado de React.
type Vivo = {
  cerrado: boolean;
  enMarcha: boolean;
  ejecucion: number;
  animacion: number;
  espera: { temporizador: ReturnType<typeof setTimeout>; soltar: () => void } | null;
  elementos: Array<HTMLElement | null>;
  inicio: number;
  ultimaLinea: number;
  reloj: ReturnType<typeof setInterval> | undefined;
  relojInicio: number;
  grabacion: Grabacion | null;
  grabando: boolean;
  guardando: boolean;
  // Micrófono: un solo flujo abierto y, como mucho, una apertura en curso que se reutiliza.
  flujo: MediaStream | null;
  microAbierto: string;
  abriendo: Promise<MediaStream> | null;
  microAbriendo: string;
  generacionMicro: number;
  contexto: AudioContext | null;
  pararNivel: (() => void) | null;
};

const crearVivo = (): Vivo => ({
  cerrado: false,
  enMarcha: false,
  ejecucion: 0,
  animacion: 0,
  espera: null,
  elementos: [],
  inicio: 0,
  ultimaLinea: -1,
  reloj: undefined,
  relojInicio: 0,
  grabacion: null,
  grabando: false,
  guardando: false,
  flujo: null,
  microAbierto: "",
  abriendo: null,
  microAbriendo: "",
  generacionMicro: 0,
  contexto: null,
  pararNivel: null,
});

const pararPistas = (flujo: MediaStream | null) =>
  flujo?.getTracks().forEach((pista) => pista.stop());

// Espera de la cuenta atrás que se puede cortar: al parar o al desmontar no queda ningún temporizador.
function esperar(v: Vivo, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const temporizador = setTimeout(() => {
      v.espera = null;
      resolve();
    }, ms);
    v.espera = { temporizador, soltar: resolve };
  });
}

function cortarEspera(v: Vivo) {
  const espera = v.espera;
  if (!espera) return;
  v.espera = null;
  clearTimeout(espera.temporizador);
  espera.soltar();
}

// Mantiene la palabra que toca al 35 % de la altura del teleprompter.
function mantenerALaVista(v: Vivo, caja: HTMLElement, elemento: HTMLElement) {
  const y = elemento.offsetTop - caja.clientHeight * 0.35;
  if (Math.abs(y - v.ultimaLinea) > 10) {
    v.ultimaLinea = y;
    caja.scrollTo?.({ top: y });
  }
}

// Ilumina el texto al ritmo del plan con requestAnimationFrame, cambiando clases en el DOM
// sin pasar por el estado de React.
function animarTexto(v: Vivo, caja: HTMLElement | null, plan: Plan, alTerminar: () => void) {
  if (!caja) return;
  v.elementos = plan.pasos.map((paso) =>
    caja.querySelector<HTMLElement>(
      paso.pausa ? `[data-pausa="${paso.c}"] i` : `.p[data-c="${paso.c}"][data-p="${paso.p}"]`,
    ),
  );
  v.inicio = performance.now();

  const fotograma = () => {
    const t = (performance.now() - v.inicio) / 1000;
    let actual: HTMLElement | null = null;

    plan.pasos.forEach((paso, i) => {
      const elemento = v.elementos[i];
      if (!elemento) return;
      if (paso.pausa) {
        const avance = Math.max(0, Math.min(1, (t - paso.desde) / (paso.hasta - paso.desde)));
        elemento.style.width = `${avance * 100}%`;
        return;
      }
      elemento.classList.toggle("dicha", t >= paso.hasta);
      const ahora = t >= paso.desde && t < paso.hasta;
      elemento.classList.toggle("ahora", ahora);
      if (ahora) actual = elemento;
    });

    if (actual) mantenerALaVista(v, caja, actual);
    // Grabando, el texto puede acabar antes que tú: la toma sigue hasta que pulses Parar (con un tope por si se te olvida).
    const margen = v.grabando ? Math.max(15, plan.total * 0.5) : 1.5;
    if (t > plan.total + margen) {
      alTerminar();
      return;
    }
    v.animacion = requestAnimationFrame(fotograma);
  };
  fotograma();
}

function arrancarReloj(v: Vivo, reloj: HTMLElement | null) {
  v.relojInicio = performance.now();
  clearInterval(v.reloj);
  v.reloj = setInterval(
    () => ponerTexto(reloj, mmss((performance.now() - v.relojInicio) / 1000)),
    250,
  );
}

function Mensaje({ children }: { children: string }) {
  return (
    <p className="border border-borde bg-superficie p-6 text-tenue">{children}</p>
  );
}

export function Teleprompter({
  datos,
  lecciones,
  seleccion,
}: {
  datos: DatosTeleprompter | null;
  lecciones: OpcionLeccion[];
  seleccion: Seleccion | null;
}) {
  const router = useRouter();
  const curso = datos?.curso;
  const numero = datos?.numero;

  // Sin lección en la URL: la última usada o, si no, la primera con guion.
  useEffect(() => {
    if (seleccion || lecciones.length === 0) return;
    const guardada = leerPreferencias().leccion;
    const destino =
      (guardada &&
        lecciones.find(
          (opcion) => opcion.curso === guardada.curso && opcion.numero === guardada.numero,
        )) ||
      lecciones[0];
    router.replace(urlTeleprompter(destino));
  }, [seleccion, lecciones, router]);

  useEffect(() => {
    if (curso !== undefined && numero !== undefined) {
      guardarPreferencias({ leccion: { curso, numero } });
    }
  }, [curso, numero]);

  const cambiarLeccion = (valor: string) => {
    const opcion = lecciones.find((candidata) => valorLeccion(candidata) === valor);
    if (opcion) router.push(urlTeleprompter(opcion));
  };

  if (!datos) {
    if (!seleccion) {
      return (
        <div className="py-8 md:py-12">
          <Mensaje>
            {lecciones.length === 0 ? "Aún no hay ninguna lección con guion." : "Cargando…"}
          </Mensaje>
        </div>
      );
    }
    return (
      <div className="grid gap-6 py-8 md:py-12">
        <SelectorLeccion
          lecciones={lecciones}
          leccion={valorLeccion(seleccion)}
          alCambiarLeccion={cambiarLeccion}
        />
        <Mensaje>Esta lección aún no tiene guion</Mensaje>
      </div>
    );
  }

  return (
    <SesionTeleprompter
      key={valorLeccion(datos)}
      datos={datos}
      lecciones={lecciones}
      alCambiarLeccion={cambiarLeccion}
    />
  );
}

type Pendiente = { escena: string; wav: Blob };

function SesionTeleprompter({
  datos,
  lecciones,
  alCambiarLeccion,
}: {
  datos: DatosTeleprompter;
  lecciones: OpcionLeccion[];
  alCambiarLeccion: (valor: string) => void;
}) {
  const router = useRouter();
  const pref = usePreferencias();
  const escenas = useMemo(
    () => datos.escenas.filter(({ modo }) => (modo as string) !== "animacion"),
    [datos.escenas],
  );
  const [tomas, setTomas] = useState<Record<string, TomaGuardada>>({});
  // Tomas convertidas a WAV cuya subida falló: se conservan para reintentar.
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const grabadas = useMemo(
    () =>
      new Set([
        ...escenas.filter(({ grabada }) => grabada).map(({ id }) => id),
        ...Object.keys(tomas),
      ]),
    [escenas, tomas],
  );
  // Se abre en la primera escena de voz sin grabar.
  const [indice, setIndice] = useState(() => {
    const pendiente = escenas.findIndex(({ modo, grabada }) => modo === "voz" && !grabada);
    return pendiente >= 0 ? pendiente : 0;
  });
  const escena = escenas.at(indice);
  const voz = escena?.modo === "voz";
  const [estado, setEstado] = useState(() =>
    estadoInicial(escena, Boolean(escena?.grabada)),
  );
  const [enMarcha, setEnMarcha] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const ocupado = enMarcha || guardando;
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [micros, setMicros] = useState<Microfono[]>([]);
  const plan = useMemo(() => (escena ? planDe(escena, pref.ritmo) : null), [escena, pref.ritmo]);

  const prompterRef = useRef<HTMLDivElement>(null);
  const relojRef = useRef<HTMLSpanElement>(null);
  const nivelRef = useRef<HTMLSpanElement>(null);
  const vivoRef = useRef<Vivo | null>(null);
  // Se crea la primera vez que hace falta, nunca durante el render.
  const vivo = (): Vivo => (vivoRef.current ??= crearVivo());

  useEffect(() => {
    const v = vivo();
    v.cerrado = false;
    return () => {
      v.cerrado = true;
      v.enMarcha = false;
      v.ejecucion++;
      v.generacionMicro++;
      cortarEspera(v);
      cancelAnimationFrame(v.animacion);
      clearInterval(v.reloj);
      v.pararNivel?.();
      v.pararNivel = null;
      v.grabacion = null;
      v.grabando = false;
      pararPistas(v.flujo);
      v.flujo = null;
      v.abriendo = null;
      v.contexto?.close().catch(() => undefined);
      v.contexto = null;
    };
  }, []);

  // ---------- teleprompter ----------
  function detener() {
    const v = vivo();
    v.enMarcha = false;
    v.ejecucion++;
    cortarEspera(v);
    cancelAnimationFrame(v.animacion);
    clearInterval(v.reloj);
    v.ultimaLinea = -1;
    setAviso(null);
  }

  function pararTodo(limpiar: boolean) {
    detener();
    setEnMarcha(false);
    if (!limpiar) return;
    prompterRef.current
      ?.querySelectorAll(".p")
      .forEach((elemento) => elemento.classList.remove("dicha", "ahora"));
    prompterRef.current
      ?.querySelectorAll<HTMLElement>("[data-pausa] i")
      .forEach((barra) => barra.style.removeProperty("width"));
  }

  function mostrarEscena(i: number) {
    if (escenas.length === 0) return;
    pararTodo(true);
    const nuevo = Math.max(0, Math.min(escenas.length - 1, i));
    setIndice(nuevo);
    setEstado(estadoInicial(escenas[nuevo], grabadas.has(escenas[nuevo].id)));
    ponerTexto(relojRef.current, "0:00");
    prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
  }

  async function cuentaAtras(textos: Cuenta[], sigue: () => boolean) {
    for (const [texto, sub, ms] of textos) {
      setAviso({ texto, sub });
      await esperar(vivo(), ms);
      if (!sigue()) return;
    }
    setAviso(null);
  }

  function empezarAnimacion(actualEscena: EscenaTeleprompter) {
    animarTexto(
      vivo(),
      prompterRef.current,
      planDe(actualEscena, leerPreferencias().ritmo),
      () => void terminar(actualEscena),
    );
  }

  async function terminar(actualEscena: EscenaTeleprompter) {
    if (vivo().grabando) {
      detener();
      await pararGrabacion(actualEscena);
    }
    pararTodo(false);
  }

  async function arrancar(conGrabacion: boolean) {
    const v = vivo();
    const actualEscena = escena;
    if (!actualEscena || v.enMarcha || v.guardando || v.cerrado) return;
    const ejecucion = ++v.ejecucion;
    const sigue = () => v.enMarcha && v.ejecucion === ejecucion;
    v.enMarcha = true;
    setEnMarcha(true);
    arrancarReloj(v, relojRef.current);

    if (actualEscena.modo !== "voz") {
      await cuentaAtras(
        [
          ["3", "dale a grabar en la cámara", 900],
          ["2", "", 800],
          ["1", "mira a la cámara: el texto es solo una guía", 800],
        ],
        sigue,
      );
      if (!sigue()) return;
      empezarAnimacion(actualEscena);
      setEstado("En marcha: cuéntalo a tu manera.");
      return;
    }

    if (conGrabacion) {
      setEstado("Abriendo el micrófono… acepta el permiso si el navegador te lo pide.");
      let flujo: MediaStream;
      try {
        flujo = await abrirMicroConNivel();
      } catch (error) {
        if (v.cerrado) return;
        setEstado(`No se puede usar el micrófono: ${mensaje(error)}`);
        if (v.ejecucion === ejecucion) pararTodo(true);
        return;
      }
      // Si se paró mientras el navegador pedía el permiso, esta ejecución ya no graba:
      // el flujo se queda abierto para la siguiente y la grabadora solo la crea la ejecución viva.
      if (!sigue()) return;
      v.grabacion = grabar(flujo);
      v.grabando = true;
      await cuentaAtras(
        [
          ["Silencio", "dos segundos sin hablar ni moverte (sirve para limpiar el ruido)", 2000],
          ["3", "empieza cuando se ilumine la primera palabra", 700],
          ["2", "", 700],
          ["1", "", 700],
        ],
        sigue,
      );
    } else {
      await cuentaAtras(
        [
          ["3", "ensayo: no se graba", 700],
          ["2", "", 700],
          ["1", "", 700],
        ],
        sigue,
      );
    }
    if (!sigue()) return;
    empezarAnimacion(actualEscena);
    setEstado(conGrabacion ? "● Grabando…" : "Ensayando…");
  }

  async function parar() {
    const v = vivo();
    if (v.guardando) return;
    if (v.grabando && escena) {
      detener();
      await pararGrabacion(escena);
    } else if (v.abriendo && escena) {
      // Aún no se graba nada: se deja de esperar al permiso y no se pierde ninguna toma.
      setEstado(estadoInicial(escena, grabadas.has(escena.id)));
    }
    pararTodo(false);
  }

  async function repetir() {
    const v = vivo();
    if (v.guardando) return;
    if (v.grabando && escena) {
      detener();
      await pararGrabacion(escena, true);
    }
    mostrarEscena(indice);
    void arrancar(voz);
  }

  // ---------- micrófono y grabación ----------
  function pintarNivel(pico: number) {
    const caja = nivelRef.current;
    const barra = caja?.firstElementChild as HTMLElement | null | undefined;
    if (!caja || !barra) return;
    barra.style.width = `${Math.min(100, pico * 110)}%`;
    caja.classList.toggle("alto", pico > 0.95);
  }

  async function listarMicros() {
    try {
      const dispositivos = await navigator.mediaDevices.enumerateDevices();
      setMicros(
        dispositivos
          .filter(({ kind, deviceId }) => kind === "audioinput" && deviceId !== "default")
          .map(({ deviceId, label }) => ({ id: deviceId, nombre: label || "Micrófono" })),
      );
    } catch {
      // La lista de micrófonos es una ayuda: sin ella se graba con el predeterminado.
    }
  }

  // Devuelve el flujo del micrófono elegido. Nunca hay dos aperturas a la vez: la que está en
  // curso se reutiliza, y una apertura que llega tarde (sesión cerrada o micrófono cambiado)
  // cierra su flujo en vez de quedarse con él.
  function abrirMicroConNivel(): Promise<MediaStream> {
    const v = vivo();
    if (v.cerrado) return Promise.reject(new Error("El teleprompter se ha cerrado"));
    const micro = leerPreferencias().micro;
    if (v.flujo && v.microAbierto === micro) return Promise.resolve(v.flujo);
    if (v.abriendo && v.microAbriendo === micro) return v.abriendo;

    // Otro micrófono: lo abierto o lo que se estaba abriendo deja de valer.
    v.generacionMicro++;
    pararPistas(v.flujo);
    v.flujo = null;
    v.pararNivel?.();
    v.pararNivel = null;

    const generacion = v.generacionMicro;
    const apertura: Promise<MediaStream> = abrirMicro(micro).then(
      (flujo) => {
        if (v.abriendo === apertura) v.abriendo = null;
        if (v.cerrado) {
          pararPistas(flujo);
          throw new Error("El teleprompter se ha cerrado");
        }
        if (generacion !== v.generacionMicro) {
          pararPistas(flujo);
          return abrirMicroConNivel();
        }
        v.flujo = flujo;
        v.microAbierto = micro;
        v.contexto ??= new AudioContext();
        v.pararNivel = medirNivel(v.contexto, flujo, pintarNivel);
        void listarMicros();
        return flujo;
      },
      (error: unknown) => {
        if (v.abriendo === apertura) v.abriendo = null;
        throw error;
      },
    );
    v.abriendo = apertura;
    v.microAbriendo = micro;
    return apertura;
  }

  async function subir(wav: Blob, idEscena: string) {
    const v = vivo();
    setEstado("Guardando…");
    try {
      const toma = await subirToma(datos.curso, datos.numero, idEscena, wav);
      setPendientes((actuales) => actuales.filter((p) => p.escena !== idEscena));
      setTomas((anteriores) => ({ ...anteriores, [idEscena]: toma }));
      setEstado(`Guardada: ${idEscena}.wav. Escúchala o pasa a la siguiente con →.`);
      if (!v.cerrado) router.refresh();
    } catch (error) {
      setPendientes((actuales) => [
        ...actuales.filter((p) => p.escena !== idEscena),
        { escena: idEscena, wav },
      ]);
      setEstado(`No se pudo guardar: ${mensaje(error)}`);
    }
  }

  async function pararGrabacion(actualEscena: EscenaTeleprompter, tirar = false) {
    const v = vivo();
    const grabacion = v.grabacion;
    if (!grabacion) return;
    v.grabacion = null;
    v.guardando = true;
    setGuardando(true);
    try {
      const audio = await grabacion.parar();
      v.grabando = false;
      if (tirar) {
        setEstado("Toma descartada.");
        return;
      }
      setEstado("Guardando…");
      // Si la sesión se cerró mientras tanto, se decodifica con un contexto propio que se cierra al acabar.
      const contexto = !v.cerrado && v.contexto ? v.contexto : new AudioContext();
      let wav: Blob;
      try {
        wav = await aWav(audio, contexto);
      } finally {
        if (contexto !== v.contexto) contexto.close().catch(() => undefined);
      }
      await subir(wav, actualEscena.id);
    } catch (error) {
      setEstado(`No se pudo guardar: ${mensaje(error)}`);
    } finally {
      v.grabando = false;
      v.guardando = false;
      setGuardando(false);
    }
  }

  async function reintentar() {
    const v = vivo();
    if (v.enMarcha || v.guardando || pendientes.length === 0) return;
    v.guardando = true;
    setGuardando(true);
    try {
      for (const { escena: idEscena, wav } of pendientes) await subir(wav, idEscena);
    } finally {
      v.guardando = false;
      setGuardando(false);
    }
  }

  async function cambiarMicro(micro: string) {
    const v = vivo();
    guardarPreferencias({ micro });
    // Grabando, se aplica en la siguiente toma para no cortarla; sin micrófono abierto, al abrirlo.
    if (v.grabando || (!v.flujo && !v.abriendo)) return;
    try {
      await abrirMicroConNivel();
    } catch (error) {
      if (!v.cerrado) setEstado(`No se puede usar el micrófono: ${mensaje(error)}`);
    }
  }

  function cambiarRitmo(ritmo: number) {
    guardarPreferencias({ ritmo });
    if (!enMarcha) mostrarEscena(indice);
  }

  function cambiarLeccion(valor: string) {
    if (ocupado) return;
    if (pendientes.length > 0 && !window.confirm("Hay una toma sin guardar. ¿Descartarla?")) {
      return;
    }
    alCambiarLeccion(valor);
  }

  // ---------- teclado ----------
  const alPulsarTecla = useEffectEvent((evento: KeyboardEvent) => {
    const destino = evento.target;
    if (
      destino instanceof Element &&
      destino.closest("input, select, textarea, [contenteditable]")
    ) {
      return;
    }
    if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
    if (evento.code === "Space") {
      evento.preventDefault();
      if (enMarcha) void parar();
      else void arrancar(false);
    } else if (evento.code === "Enter" && !enMarcha && voz) {
      evento.preventDefault();
      void arrancar(true);
    } else if (evento.code === "Escape" && enMarcha) {
      void parar();
    } else if (evento.key === "r" || evento.key === "R") {
      if (enMarcha) void repetir();
    } else if (evento.code === "ArrowRight" && !ocupado) {
      mostrarEscena(indice + 1);
    } else if (evento.code === "ArrowLeft" && !ocupado) {
      mostrarEscena(indice - 1);
    }
  });

  useEffect(() => {
    const escuchar = (evento: KeyboardEvent) => alPulsarTecla(evento);
    document.addEventListener("keydown", escuchar);
    return () => document.removeEventListener("keydown", escuchar);
  }, []);

  // ---------- vista ----------
  const tomaLocal = escena ? tomas[escena.id] : undefined;
  const toma = !voz || !escena
    ? null
    : tomaLocal
      ? `${urlMedio(tomaLocal.ruta)}&v=${tomaLocal.version}`
      : escena.grabada && escena.toma
        ? `${urlMedio(escena.toma)}${escena.version_toma !== null ? `&v=${escena.version_toma}` : ""}`
        : null;
  const duracion =
    escena && plan
      ? voz
        ? `≈ ${mmss(plan.total)} a ${pref.ritmo} ppm`
        : `≈ ${mmss(plan.total)} · se graba con tu cámara: ${escena.id}.mov`
      : "";

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4rem-1px)]">
      <BarraAjustes
        lecciones={lecciones}
        leccion={valorLeccion(datos)}
        alCambiarLeccion={cambiarLeccion}
        bloqueada={ocupado}
        ritmo={pref.ritmo}
        alCambiarRitmo={cambiarRitmo}
        letra={pref.letra}
        alCambiarLetra={(letra) => guardarPreferencias({ letra })}
        micro={pref.micro}
        micros={micros}
        alCambiarMicro={(micro) => void cambiarMicro(micro)}
        nivelRef={nivelRef}
      />
      <BarraEscenas
        escenas={escenas}
        indice={indice}
        grabadas={grabadas}
        desactivada={ocupado}
        alElegir={(i) => {
          if (!ocupado) mostrarEscena(i);
        }}
      />

      {escena ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 px-4 pt-[18px] md:px-12">
            <span
              className={`rounded-md px-2.5 py-1 text-[13px] font-extrabold tracking-[0.14em] uppercase ${
                voz ? "bg-marca/15 text-azul-claro" : "bg-ambar/15 text-ambar"
              }`}
            >
              {voz ? "Voz en off · leer" : "Cámara · con tus palabras"}
            </span>
            <h1 className="m-0 text-2xl font-semibold text-balance md:text-[28px]">
              {`${escena.id} · ${textoLegible(escena.titulo)}`}
            </h1>
            <span className="font-mono text-tenue">{duracion}</span>
          </div>
          {!voz && escena.puntos.length > 0 ? (
            <ul className="mx-4 mt-3.5 list-disc rounded-xl border border-borde bg-superficie py-2.5 pr-[18px] pl-[34px] text-[17px] leading-[1.45] text-ambar md:mx-12">
              {escena.puntos.map((punto, i) => (
                <li key={i} className="[&+li]:mt-0.5">
                  {punto}
                </li>
              ))}
            </ul>
          ) : null}
          <div
            ref={prompterRef}
            style={{ "--letra": `${pref.letra}px` } as CSSProperties}
            className="relative h-[60dvh] overflow-y-auto scroll-smooth px-4 motion-reduce:scroll-auto md:h-auto md:min-h-0 md:flex-1 md:px-12"
          >
            {/* El margen va dentro: en el propio contenedor impediría que encogiera a su hueco. */}
            <div className="pt-[32vh] pb-[60vh]">
              <TextoConRitmo key={escena.id} cues={escena.cues} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 p-6">
          <Mensaje>Esta lección no tiene escenas de voz ni de cámara.</Mensaje>
        </div>
      )}

      <PieControles
        voz={voz}
        enMarcha={enMarcha}
        guardando={guardando}
        pendiente={pendientes.length > 0}
        alReintentar={() => void reintentar()}
        alEnsayar={() => void arrancar(false)}
        alGrabar={() => void arrancar(true)}
        alParar={() => void parar()}
        alRepetir={() => void repetir()}
        relojRef={relojRef}
        estado={estado}
        toma={toma}
      />

      {aviso ? (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,10,12,0.82)] px-4 text-center text-[64px] font-extrabold"
        >
          <div>
            {aviso.texto}
            <small className="mt-3 block text-2xl font-semibold text-tenue">{aviso.sub}</small>
          </div>
        </div>
      ) : null}
    </div>
  );
}
