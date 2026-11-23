"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  alEventoToma,
  colocarPrevia,
  mostrarEscena,
} from "@/components/teleprompter/accionesEscena";
import {
  alGuardarTexto,
  cambiarLeccion,
  cambiarRitmo,
  cambiarVista,
  cancelarEdicion,
  editar,
} from "@/components/teleprompter/accionesSesion";
import { arrancar, parar, reintentar, repetir } from "@/components/teleprompter/arranqueLectura";
import {
  BarraAjustes,
  valorLeccion,
  type OpcionLeccion,
} from "@/components/teleprompter/BarraAjustes";
import { BarraEscenas } from "@/components/teleprompter/BarraEscenas";
import type { ContextoSesion } from "@/components/teleprompter/contextoSesion";
import { estadoInicial, tomaEscena } from "@/components/teleprompter/estadoEscena";
import { PieControles } from "@/components/teleprompter/PieControles";
import { useAtajosTeclado } from "@/components/teleprompter/useAtajosTeclado";
import { useEstadoSesion, useGrabadas } from "@/components/teleprompter/useEstadoSesion";
import { useLectura, type Aviso } from "@/components/teleprompter/useLectura";
import { useSeguimientoPrevia } from "@/components/teleprompter/useSeguimientoPrevia";
import { useSesionGrabacion } from "@/components/teleprompter/useSesionGrabacion";
import { ZonaEscena } from "@/components/teleprompter/ZonaEscena";
import { guardarPreferencias, usePreferencias } from "@/lib/teleprompter/preferencias";
import type { EstadoAccion, Teleprompter as DatosTeleprompter } from "@/lib/tipos";

function AvisoCuentaAtras({ aviso }: { aviso: Aviso | null }) {
  if (!aviso) return null;
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 z-50 grid place-items-center bg-[rgba(10,10,12,0.82)] px-4 text-center text-[64px] font-extrabold"
    >
      <div>
        {aviso.texto}
        <small className="mt-3 block text-2xl font-semibold text-tenue">{aviso.sub}</small>
      </div>
    </div>
  );
}

export function SesionTeleprompter({
  datos,
  lecciones,
  acciones,
  alCambiarLeccion,
}: {
  datos: DatosTeleprompter;
  lecciones: OpcionLeccion[];
  acciones: EstadoAccion[] | null;
  alCambiarLeccion: (valor: string) => void;
}) {
  const router = useRouter();
  const pref = usePreferencias();
  const estadoSesion = useEstadoSesion(datos, pref);
  const { guion, escenas, indice, escena, estadoPropio, setEstado, editando, plan } = estadoSesion;
  const voz = escena?.modo === "voz";
  const hayCamara = escenas.some(({ modo }) => modo === "camara");
  const puntos = !voz && pref.vistaCamara === "puntos";

  const prompterRef = useRef<HTMLDivElement>(null);
  const relojRef = useRef<HTMLSpanElement>(null);
  const nivelRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bucleTomaRef = useRef(0);
  const subiendoTomasRef = useRef(false);
  const lectura = useLectura({ prompterRef, relojRef });
  const sesion = useSesionGrabacion({
    curso: guion.curso,
    numero: guion.numero,
    micro: pref.micro,
    nivelRef,
    alEstado: setEstado,
    alGuardar: () => router.refresh(),
  });
  // El trabajo de la vista previa se sigue aquí, aunque el panel esté oculto.
  const seguimiento = useSeguimientoPrevia({
    curso: guion.curso,
    numero: guion.numero,
    previa: guion.previa,
  });
  const { enMarcha, aviso } = lectura;
  const { tomas, pendientes, guardando, grabando, micros } = sesion;
  const ocupado = enMarcha || guardando;
  const bloqueado = ocupado || editando;
  const grabadas = useGrabadas(escenas, tomas);
  const estado =
    estadoPropio ??
    estadoInicial(escena, Boolean(escena && grabadas.has(escena.id)), pref.vistaCamara);

  useEffect(() => () => cancelAnimationFrame(bucleTomaRef.current), []);

  const ctx: ContextoSesion = {
    ...estadoSesion,
    voz,
    enMarcha,
    ocupado,
    bloqueado,
    pendientes,
    montaje: guion.montaje,
    lectura,
    sesion,
    prompterRef,
    relojRef,
    videoRef,
    bucleTomaRef,
    subiendoTomasRef,
    alCambiarLeccion,
  };
  useAtajosTeclado(ctx);

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4rem-1px)]">
      <BarraAjustes
        lecciones={lecciones}
        leccion={valorLeccion(guion)}
        alCambiarLeccion={(valor) => cambiarLeccion(ctx, valor)}
        bloqueada={bloqueado}
        ritmo={pref.ritmo}
        alCambiarRitmo={(ritmo) => cambiarRitmo(ctx, ritmo)}
        letra={pref.letra}
        alCambiarLetra={(letra) => guardarPreferencias({ letra })}
        micro={pref.micro}
        micros={micros}
        alCambiarMicro={(micro) => void sesion.cambiarMicro(micro)}
        alProbarMicro={() => void sesion.probarMicro()}
        microDesactivado={grabando || guardando || sesion.abriendoMicro}
        microDelPortatil={sesion.microDelPortatil}
        nivelRef={nivelRef}
        tamPrevia={pref.tamPrevia}
        alCambiarTamPrevia={(tamPrevia) => guardarPreferencias({ tamPrevia })}
      />
      <BarraEscenas
        escenas={escenas}
        indice={indice}
        grabadas={grabadas}
        desactivada={bloqueado}
        alElegir={(i) => {
          if (!bloqueado) mostrarEscena(ctx, i);
        }}
      />

      <ZonaEscena
        escena={escena}
        plan={plan}
        voz={voz}
        puntos={puntos}
        editando={editando}
        enMarcha={enMarcha}
        hayCamara={hayCamara}
        pref={pref}
        guion={guion}
        seguimiento={seguimiento}
        acciones={acciones}
        prompterRef={prompterRef}
        videoRef={videoRef}
        alCargarVideo={() => {
          if (!lectura.enMarchaAhora()) colocarPrevia(ctx, escena?.id);
        }}
        alGuardarTexto={(nuevo) => alGuardarTexto(ctx, nuevo)}
        alCancelarEdicion={() => cancelarEdicion(ctx)}
        alCambiarSubiendo={(subiendo) => {
          subiendoTomasRef.current = subiendo;
        }}
      />

      <PieControles
        voz={voz}
        enMarcha={enMarcha}
        guardando={guardando}
        pendiente={pendientes.length > 0}
        editando={editando}
        vistaCamara={escena && !voz ? pref.vistaCamara : null}
        alReintentar={() => reintentar(ctx)}
        alEnsayar={() => void arrancar(ctx, false)}
        alGrabar={() => void arrancar(ctx, true)}
        alParar={() => void parar(ctx)}
        alRepetir={() => void repetir(ctx)}
        alEditar={() => editar(ctx)}
        alCambiarVista={() => cambiarVista(ctx)}
        alEventoToma={(audio, evento) => alEventoToma(ctx, audio, evento)}
        relojRef={relojRef}
        estado={estado}
        toma={tomaEscena(escena, voz, tomas)}
      />

      <AvisoCuentaAtras aviso={aviso} />
    </div>
  );
}
