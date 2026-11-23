import {
  escenaMontajeDe,
  mostrarEscena,
  pararTodo,
} from "@/components/teleprompter/accionesEscena";
import type { ContextoSesion } from "@/components/teleprompter/contextoSesion";
import { planDe } from "@/components/teleprompter/estadoEscena";
import { iniciosDeFrases, seguirLectura } from "@/components/teleprompter/sincroniaPrevia";
import type { Cuenta, Ejecucion } from "@/components/teleprompter/useLectura";
import { MENSAJE_ABRIENDO_MICRO, mensajeFalloMicro } from "@/lib/teleprompter/microfonos";
import { leerPreferencias } from "@/lib/teleprompter/preferencias";
import type { EscenaTeleprompter } from "@/lib/tipos";

const CUENTA_CAMARA: Cuenta[] = [
  ["3", "dale a grabar en la cámara", 900],
  ["2", "", 800],
  ["1", "mira a la cámara: el texto es solo una guía", 800],
];

const CUENTA_GRABACION: Cuenta[] = [
  ["Silencio", "dos segundos sin hablar ni moverte (sirve para limpiar el ruido)", 2000],
  ["3", "empieza cuando se ilumine la primera palabra", 700],
  ["2", "", 700],
  ["1", "", 700],
];

const CUENTA_ENSAYO: Cuenta[] = [
  ["3", "ensayo: no se graba", 700],
  ["2", "", 700],
  ["1", "", 700],
];

function empezarAnimacion(ctx: ContextoSesion, actualEscena: EscenaTeleprompter) {
  const planActual = planDe(actualEscena, leerPreferencias().ritmo);
  const escenaMontaje = escenaMontajeDe(ctx, actualEscena.id);
  const iniciosFrases = iniciosDeFrases(planActual, actualEscena.cues.length);
  const { lectura, sesion, montaje } = ctx;
  lectura.animar(planActual, {
    margen: () => (sesion.grabandoAhora() ? Math.max(15, planActual.total * 0.5) : 1.5),
    alFotograma: (t) => {
      if (!montaje || !escenaMontaje) return;
      seguirLectura(ctx.videoRef.current, {
        t,
        plan: planActual,
        escenaMontaje,
        fps: montaje.fps,
        iniciosFrases,
      });
    },
    alTerminar: () => void terminar(ctx),
  });
}

async function terminar(ctx: ContextoSesion) {
  if (ctx.sesion.grabandoAhora()) {
    ctx.lectura.detener();
    await ctx.sesion.pararGrabacion();
  }
  pararTodo(ctx, false);
}

// Escena a cámara: la cuenta atrás de la cámara y el texto como guía.
async function arrancarCamara(
  ctx: ContextoSesion,
  actualEscena: EscenaTeleprompter,
  sigue: () => boolean,
) {
  // Con los puntos a la vista no hay texto que seguir: solo corre el cronómetro.
  if (leerPreferencias().vistaCamara === "puntos") {
    ctx.setEstado("Cronómetro en marcha.");
    return;
  }
  await ctx.lectura.cuentaAtras(CUENTA_CAMARA, sigue);
  if (!sigue()) return;
  empezarAnimacion(ctx, actualEscena);
  ctx.setEstado("En marcha: cuéntalo a tu manera.");
}

// Si no se puede abrir el micrófono o arrancar la grabadora.
function falloMicro(ctx: ContextoSesion, ejecucion: Ejecucion, error: unknown) {
  if (ctx.sesion.cerrada()) return;
  ctx.setEstado(mensajeFalloMicro(error));
  if (ejecucion.vigente()) pararTodo(ctx, true);
}

// Escena de voz: grabando (abre el micrófono y la grabadora) o ensayando.
async function arrancarVoz(
  ctx: ContextoSesion,
  actualEscena: EscenaTeleprompter,
  ejecucion: Ejecucion,
  conGrabacion: boolean,
) {
  const { lectura, sesion } = ctx;
  const { sigue } = ejecucion;
  if (conGrabacion) {
    ctx.setEstado(MENSAJE_ABRIENDO_MICRO);
    let flujo: MediaStream;
    try {
      flujo = await sesion.abrirMicroConNivel();
    } catch (error) {
      falloMicro(ctx, ejecucion, error);
      return;
    }
    // Si se paró mientras el navegador pedía el permiso, esta ejecución ya no graba:
    // el flujo se queda abierto para la siguiente y la grabadora solo la crea la ejecución viva.
    if (!sigue()) return;
    try {
      sesion.empezarGrabacion(flujo, actualEscena.id);
    } catch (error) {
      falloMicro(ctx, ejecucion, error);
      return;
    }
    await lectura.cuentaAtras(CUENTA_GRABACION, sigue);
  } else {
    await lectura.cuentaAtras(CUENTA_ENSAYO, sigue);
  }
  if (!sigue()) return;
  empezarAnimacion(ctx, actualEscena);
  ctx.setEstado(conGrabacion ? "● Grabando…" : "Ensayando…");
}

export async function arrancar(ctx: ContextoSesion, conGrabacion: boolean) {
  const actualEscena = ctx.escena;
  const { lectura, sesion } = ctx;
  if (!actualEscena || ctx.editando || sesion.guardandoAhora() || sesion.cerrada()) return;
  const ejecucion = lectura.empezar();
  if (!ejecucion) return;
  cancelAnimationFrame(ctx.bucleTomaRef.current);

  if (actualEscena.modo !== "voz") return arrancarCamara(ctx, actualEscena, ejecucion.sigue);
  return arrancarVoz(ctx, actualEscena, ejecucion, conGrabacion);
}

export async function parar(ctx: ContextoSesion) {
  const { lectura, sesion } = ctx;
  if (sesion.guardandoAhora()) return;
  if (sesion.grabandoAhora()) {
    // Se sube a la escena en la que empezó la toma, aunque la visible haya cambiado.
    lectura.detener();
    await sesion.pararGrabacion();
  } else if (sesion.abriendoAhora() && ctx.escena) {
    // Aún no se graba nada: se deja de esperar al permiso y no se pierde ninguna toma.
    ctx.setEstado(null);
  }
  pararTodo(ctx, false);
}

export async function repetir(ctx: ContextoSesion) {
  const { lectura, sesion } = ctx;
  if (sesion.guardandoAhora()) return;
  if (sesion.grabandoAhora()) {
    lectura.detener();
    await sesion.pararGrabacion(true);
  }
  mostrarEscena(ctx, ctx.indice);
  void arrancar(ctx, ctx.voz);
}

export function reintentar(ctx: ContextoSesion) {
  if (ctx.lectura.enMarchaAhora()) return;
  void ctx.sesion.reintentar();
}
