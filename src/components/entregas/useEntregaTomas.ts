"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import {
  anadir,
  cancelarSubida,
  colocar,
  identificar,
  leerAlEntrar,
  quitar,
  recargar,
  trasIdentificar,
  vigilarMontaje,
  type AjustesEntrega,
  type EntornoEntrega,
  type RefsEntrega,
} from "@/components/entregas/accionesEntregaTomas";
import {
  enCurso,
  enMarcha,
  revisionTomas,
  textoSinAnalizar,
  trabajoEnMarcha,
  type Subida,
  type SubidaAqui,
} from "@/components/entregas/modeloEntregaTomas";
import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import type { Entregas, EstadoAccion, Trabajo } from "@/lib/tipos";

export interface OpcionesEntregaTomas {
  curso: string;
  numero: number;
  // Escena de cámara del teleprompter en la que está la zona.
  escena?: string;
  // Estado de las acciones de la lección, para seguir una identificación en marcha.
  acciones?: EstadoAccion[] | null;
  // Avisa de si hay alguna subida en curso (el teleprompter pregunta antes de cambiar de lección).
  alCambiarSubiendo?: (subiendo: boolean) => void;
}

// El estado de la zona, sus refs y sus efectos: el aviso de subida en curso, el desmontaje y la
// primera lectura de la lección.
function useEstadoEntrega({
  curso,
  numero,
  acciones,
  alCambiarSubiendo,
}: Omit<OpcionesEntregaTomas, "escena">) {
  const [entregas, setEntregas] = useState<Entregas | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [subidasAqui, setSubidasAqui] = useState<SubidaAqui[]>([]);
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [trabajoIdentificar, setTrabajoIdentificar] = useState<Trabajo | null>(() =>
    trabajoEnMarcha(acciones, "identificar-tomas"),
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [colocadas, setColocadas] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [lanzandoIdentificacion, setLanzandoIdentificacion] = useState(false);

  const montado = useRef(true);
  const cola = useRef<Subida[]>([]);
  const procesando = useRef(false);
  const controles = useRef(new Map<number, AbortController>());
  const canceladas = useRef(new Set<number>());
  const siguienteClave = useRef(1);
  const conocidas = useRef(new Set<string>());
  const vistasAlIdentificar = useRef(new Set<string>());
  const identificacionAdoptada = useRef(trabajoIdentificar !== null);

  const subiendo = subidas.some(enCurso);
  useAvisoAlSalir(subiendo);

  const avisarSubiendo = useEffectEvent((valor: boolean) => {
    alCambiarSubiendo?.(valor);
  });
  useEffect(() => {
    avisarSubiendo(subiendo);
  }, [subiendo]);

  useEffect(() => vigilarMontaje({ montado, cola, controles }), []);

  useEffect(
    () =>
      leerAlEntrar(
        curso,
        numero,
        { conocidas, vistasAlIdentificar, identificacionAdoptada },
        { setEntregas, setErrorLectura },
      ),
    [curso, numero],
  );

  const refs: RefsEntrega = {
    montado, cola, procesando, controles, canceladas, siguienteClave,
    conocidas, vistasAlIdentificar, identificacionAdoptada,
  };
  const ajustes: AjustesEntrega = {
    setEntregas, setErrorLectura, setSubidas, setSubidasAqui, setSeleccion,
    setTrabajoIdentificar, setMensaje, setColocadas, setOcupado, setArrastrando,
    setLanzandoIdentificacion,
  };
  const estado = {
    entregas, errorLectura, subidas, subidasAqui, seleccion, trabajoIdentificar,
    mensaje, colocadas, ocupado, arrastrando, lanzandoIdentificacion, subiendo,
  };
  return { estado, refs, ajustes };
}

// Todo lo que pinta EntregaTomas: el estado, lo derivado para revisar las tomas y los
// manejadores, que llevan a las acciones lo del render en curso.
export function useEntregaTomas({ escena, ...opciones }: OpcionesEntregaTomas) {
  const router = useRouter();
  const { estado, refs, ajustes } = useEstadoEntrega(opciones);
  const { curso, numero } = opciones;
  const entorno: EntornoEntrega = { ...ajustes, curso, numero, escena, router, refs };

  const identificacion = useSeguimientoTrabajo({
    trabajo: estado.trabajoIdentificar,
    alTerminar: (terminado) => {
      void trasIdentificar(entorno, terminado);
    },
    // Tras reiniciar la API el trabajo ya no existe: no se espera más y se lee lo que haya.
    alDesaparecer: () => {
      ajustes.setTrabajoIdentificar(null);
      void recargar(entorno, true);
    },
    refrescarAlTerminar: false,
  });
  const identificando = enMarcha(identificacion);
  // Mientras se identifica no se entregan más: lo nuevo no entraría en esta identificación.
  const entregaDesactivada = identificando || estado.lanzandoIdentificacion;
  const revision = revisionTomas(estado.entregas, estado.subidasAqui, estado.seleccion);

  return {
    ...estado,
    ...revision,
    identificacion,
    identificando,
    entregaDesactivada,
    // Mientras se lanza o sigue una identificación, la propuesta puede cambiar: no se quita ni
    // se coloca nada.
    bloqueada:
      estado.ocupado || estado.subiendo || identificando || estado.lanzandoIdentificacion,
    textoSinAnalizar: textoSinAnalizar(identificando, Boolean(estado.entregas?.propuesta)),
    setArrastrando: ajustes.setArrastrando,
    alAnadir: (archivos: File[]) => anadir(entorno, archivos, entregaDesactivada),
    alCancelarSubida: (clave: number) => cancelarSubida(entorno, clave),
    alCambiarDestino: (archivo: string, valor: string) =>
      ajustes.setSeleccion((actual) => ({ ...actual, [archivo]: valor })),
    alQuitar: (archivo: string) => void quitar(entorno, archivo),
    alColocar: () => void colocar(entorno, estado.entregas, revision.asignaciones),
    alIdentificar: () => void identificar(entorno),
  };
}
