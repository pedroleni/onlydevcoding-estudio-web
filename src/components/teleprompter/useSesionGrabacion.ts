"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import { useMicros } from "@/components/teleprompter/useMicros";
import {
  abrirMicro,
  aWav,
  grabar,
  medirNivel,
  subirToma,
  type Grabacion,
} from "@/lib/teleprompter/grabadora";
import { guardarPreferencias, leerPreferencias } from "@/lib/teleprompter/preferencias";
import { mensajeError } from "@/lib/mensaje-error";
import { mensajeFalloMicro } from "@/lib/teleprompter/microfonos";
import type { TomaGuardada } from "@/lib/tipos";

export type Pendiente = { escena: string; wav: Blob };

type Subida = { ok: true } | { ok: false; error: string };

// Tras reintentar varias tomas: cuántas se han subido y cuántas siguen pendientes.
function resumenSubidas(subidas: number, total: number, ultimoError: string): string {
  const quedan = total - subidas;
  if (quedan === 0) return `Subidas las ${total} tomas pendientes.`;
  const pendientes = quedan === 1 ? "queda 1 pendiente" : `quedan ${quedan} pendientes`;
  return `Subidas: ${subidas} de ${total} tomas; ${pendientes}. Último error: ${ultimoError}`;
}

// Micrófono, grabadora y subidas: todo lo que pertenece al navegador vive fuera del estado de React.
type Vivo = {
  cerrado: boolean;
  grabacion: Grabacion | null;
  // La escena en la que empezó la grabación en curso: la toma se sube ahí aunque cambie la visible.
  escenaGrabando: string;
  grabando: boolean;
  guardando: boolean;
  // Un solo flujo abierto y, como mucho, una apertura en curso que se reutiliza.
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
  grabacion: null,
  escenaGrabando: "",
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

// Lo que las acciones de la sesión toman del render en curso: la lección, los avisos al
// componente y los setters del estado de React.
type Entorno = {
  curso: string;
  numero: number;
  alEstado: (texto: string) => void;
  alGuardar: () => void;
  setTomas: Dispatch<SetStateAction<Record<string, TomaGuardada>>>;
  setPendientes: Dispatch<SetStateAction<Pendiente[]>>;
  setGuardando: (guardando: boolean) => void;
  setGrabando: (grabando: boolean) => void;
};

// Al cerrar la sesión se suelta todo lo del navegador; lo que llegue tarde ya no se usa.
function cerrarSesion(v: Vivo) {
  v.cerrado = true;
  v.generacionMicro++;
  v.pararNivel?.();
  v.pararNivel = null;
  v.grabacion = null;
  v.grabando = false;
  pararPistas(v.flujo);
  v.flujo = null;
  v.abriendo = null;
  v.contexto?.close().catch(() => undefined);
  v.contexto = null;
}

function pintarNivel(caja: HTMLElement | null, pico: number) {
  const barra = caja?.firstElementChild as HTMLElement | null | undefined;
  if (!caja || !barra) return;
  barra.style.width = `${Math.min(100, pico * 110)}%`;
  caja.classList.toggle("alto", pico > 0.95);
}

type AvisosMicro = {
  alNivel: (pico: number) => void;
};

// Devuelve el flujo del micrófono elegido. Nunca hay dos aperturas a la vez: la que está en
// curso se reutiliza, y una apertura que llega tarde (sesión cerrada o micrófono cambiado)
// cierra su flujo en vez de quedarse con él.
function abrirMicroConNivel(v: Vivo, avisos: AvisosMicro): Promise<MediaStream> {
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
        return abrirMicroConNivel(v, avisos);
      }
      v.flujo = flujo;
      v.microAbierto = micro;
      v.contexto ??= new AudioContext();
      v.pararNivel = medirNivel(v.contexto, flujo, avisos.alNivel);
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

// Lo abierto del micrófono deja de valer (por ejemplo, un flujo muerto): la siguiente toma lo
// vuelve a abrir.
function cerrarMicro(v: Vivo) {
  v.generacionMicro++;
  v.pararNivel?.();
  v.pararNivel = null;
  pararPistas(v.flujo);
  v.flujo = null;
  v.microAbierto = "";
  v.abriendo = null;
}

// Solo la ejecución viva crea la grabadora, sobre el flujo que acaba de recibir, y recuerda la
// escena en la que se empieza. Si la grabadora no arranca (micrófono desconectado, formato no
// admitido), cierra el micrófono y lanza el error.
function empezarGrabacion(v: Vivo, entorno: Entorno, flujo: MediaStream, idEscena: string) {
  try {
    v.grabacion = grabar(flujo);
  } catch (error) {
    v.grabacion = null;
    cerrarMicro(v);
    throw error;
  }
  v.escenaGrabando = idEscena;
  v.grabando = true;
  entorno.setGrabando(true);
}

async function subir(v: Vivo, entorno: Entorno, wav: Blob, idEscena: string): Promise<Subida> {
  const { curso, numero, alEstado, alGuardar, setPendientes, setTomas } = entorno;
  alEstado("Guardando…");
  try {
    const toma = await subirToma(curso, numero, idEscena, wav);
    setPendientes((actuales) => actuales.filter((p) => p.escena !== idEscena));
    setTomas((anteriores) => ({ ...anteriores, [idEscena]: toma }));
    alEstado(`Guardada: ${idEscena}.wav. Escúchala o pasa a la siguiente con →.`);
    if (!v.cerrado) alGuardar();
    return { ok: true };
  } catch (error) {
    setPendientes((actuales) => [
      ...actuales.filter((p) => p.escena !== idEscena),
      { escena: idEscena, wav },
    ]);
    alEstado(`No se pudo guardar: ${mensajeError(error)}`);
    return { ok: false, error: mensajeError(error) };
  }
}

// Para la grabación en curso y sube la toma a la escena en la que empezó (o la tira).
async function pararGrabacion(v: Vivo, entorno: Entorno, tirar: boolean) {
  const { alEstado, setGrabando, setGuardando } = entorno;
  const grabacion = v.grabacion;
  if (!grabacion) return;
  const idEscena = v.escenaGrabando;
  v.grabacion = null;
  v.guardando = true;
  setGuardando(true);
  try {
    const audio = await grabacion.parar();
    v.grabando = false;
    setGrabando(false);
    if (tirar) {
      alEstado("Toma descartada.");
      return;
    }
    alEstado("Guardando…");
    // Si la sesión se cerró mientras tanto, se decodifica con un contexto propio que se cierra al acabar.
    const contexto = !v.cerrado && v.contexto ? v.contexto : new AudioContext();
    let wav: Blob;
    try {
      wav = await aWav(audio, contexto);
    } finally {
      if (contexto !== v.contexto) contexto.close().catch(() => undefined);
    }
    await subir(v, entorno, wav, idEscena);
  } catch (error) {
    alEstado(`No se pudo guardar: ${mensajeError(error)}`);
  } finally {
    v.grabando = false;
    setGrabando(false);
    v.guardando = false;
    setGuardando(false);
  }
}

async function reintentar(v: Vivo, entorno: Entorno, pendientes: Pendiente[]) {
  if (v.guardando || pendientes.length === 0) return;
  v.guardando = true;
  entorno.setGuardando(true);
  try {
    let subidas = 0;
    let ultimoError = "";
    for (const { escena: idEscena, wav } of pendientes) {
      const resultado = await subir(v, entorno, wav, idEscena);
      if (resultado.ok) subidas++;
      else ultimoError = resultado.error;
    }
    if (pendientes.length > 1) {
      entorno.alEstado(resumenSubidas(subidas, pendientes.length, ultimoError));
    }
  } finally {
    v.guardando = false;
    entorno.setGuardando(false);
  }
}

async function cambiarMicro(
  v: Vivo,
  micro: string,
  alEstado: (texto: string) => void,
  abrir: () => Promise<MediaStream>,
) {
  guardarPreferencias({ micro });
  // Grabando, se aplica en la siguiente toma para no cortarla; sin micrófono abierto, al abrirlo.
  if (v.grabando || (!v.flujo && !v.abriendo)) return;
  try {
    await abrir();
  } catch (error) {
    if (!v.cerrado) alEstado(mensajeFalloMicro(error));
  }
}

export function useSesionGrabacion({
  curso,
  numero,
  micro,
  nivelRef,
  alEstado,
  alGuardar,
}: {
  curso: string;
  numero: number;
  micro: string;
  nivelRef: RefObject<HTMLElement | null>;
  alEstado: (texto: string) => void;
  // Tras guardar una toma con la sesión abierta (para refrescar los datos de la página).
  alGuardar: () => void;
}) {
  const [tomas, setTomas] = useState<Record<string, TomaGuardada>>({});
  // Tomas convertidas a WAV cuya subida falló: se conservan para reintentar.
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [guardando, setGuardando] = useState(false);
  // Copia en estado de `vivo.grabando`, para avisar al salir de la página.
  const [grabando, setGrabando] = useState(false);
  const vivoRef = useRef<Vivo | null>(null);
  // Se crea la primera vez que hace falta, nunca durante el render.
  const vivo = (): Vivo => (vivoRef.current ??= crearVivo());

  // Salir de la página (recargar, cerrar o un enlace interno) con una toma grabándose, sin subir
  // o subiéndose la perdería: se pregunta antes.
  useAvisoAlSalir(grabando || pendientes.length > 0 || guardando);

  useEffect(() => {
    const v = vivo();
    v.cerrado = false;
    return () => cerrarSesion(v);
  }, []);

  const dispositivos = useMicros({
    micro,
    alEstado,
    // El micrófono abierto de verdad: la preferencia puede haber cambiado mientras se abría.
    abrirMicro: () =>
      abrirMicroConNivel(vivo(), {
        alNivel: (pico) => pintarNivel(nivelRef.current, pico),
      }).then((flujo) => ({ flujo, micro: vivo().microAbierto })),
  });

  const entorno: Entorno = {
    curso,
    numero,
    alEstado,
    alGuardar,
    setTomas,
    setPendientes,
    setGuardando,
    setGrabando,
  };
  const abrirConNivel = dispositivos.abrirMicroConNivel;

  return {
    tomas,
    pendientes,
    guardando,
    grabando,
    micros: dispositivos.micros,
    microDelPortatil: dispositivos.microDelPortatil,
    abriendoMicro: dispositivos.abriendoMicro,
    probarMicro: dispositivos.probarMicro,
    abrirMicroConNivel: abrirConNivel,
    empezarGrabacion: (flujo: MediaStream, idEscena: string) =>
      empezarGrabacion(vivo(), entorno, flujo, idEscena),
    pararGrabacion: (tirar = false) => pararGrabacion(vivo(), entorno, tirar),
    reintentar: () => reintentar(vivo(), entorno, pendientes),
    cambiarMicro: (micro: string) => cambiarMicro(vivo(), micro, alEstado, abrirConNivel),
    grabandoAhora: () => vivo().grabando,
    guardandoAhora: () => vivo().guardando,
    abriendoAhora: () => vivo().abriendo !== null,
    cerrada: () => vivo().cerrado,
  };
}
