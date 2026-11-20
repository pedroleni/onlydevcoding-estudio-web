import type { useRouter } from "next/navigation";
import type { Dispatch, RefObject, SetStateAction } from "react";

import {
  avisosDeSustitucion,
  enCurso,
  enMarcha,
  type Subida,
  type SubidaAqui,
} from "@/components/entregas/modeloEntregaTomas";
import { subirEntrega, type ResultadoSubida } from "@/components/entregas/subirEntrega";
import { colocarTomas, leerEntregas, quitarEntrega } from "@/lib/acciones-entregas";
import { lanzarAccion } from "@/lib/acciones-estudio";
import type { AsignacionToma, Entregas, Trabajo } from "@/lib/tipos";

// Mensajes fijos para cuando una Server Action no llega a responder: sin detalles internos.
const SIN_LANZAR = "No se han podido identificar las tomas. Vuelve a intentarlo.";
const SIN_LEER = "No se han podido leer las tomas entregadas. Vuelve a intentarlo.";
const SIN_QUITAR = "No se ha podido quitar la toma. Vuelve a intentarlo.";
const SIN_COLOCAR = "No se han podido colocar las tomas. Vuelve a intentarlo.";

type Ajuste<T> = Dispatch<SetStateAction<T>>;

// Lo que vive fuera del estado de React mientras la zona está montada.
export interface RefsEntrega {
  montado: RefObject<boolean>;
  cola: RefObject<Subida[]>;
  procesando: RefObject<boolean>;
  controles: RefObject<Map<number, AbortController>>;
  canceladas: RefObject<Set<number>>;
  siguienteClave: RefObject<number>;
  // Archivos de entregas/ que se conocen (leídos o subidos desde aquí) y los que ya han entrado
  // en una identificación de esta visita: al terminar, solo se repite por los que no.
  conocidas: RefObject<Set<string>>;
  vistasAlIdentificar: RefObject<Set<string>>;
  // Si al llegar ya había una identificación en marcha, lo que se lea primero entra en ella.
  identificacionAdoptada: RefObject<boolean>;
}

export interface AjustesEntrega {
  setEntregas: Ajuste<Entregas | null>;
  setErrorLectura: Ajuste<string | null>;
  setSubidas: Ajuste<Subida[]>;
  setSubidasAqui: Ajuste<SubidaAqui[]>;
  setSeleccion: Ajuste<Record<string, string>>;
  setTrabajoIdentificar: Ajuste<Trabajo | null>;
  setMensaje: Ajuste<string | null>;
  setColocadas: Ajuste<boolean>;
  setOcupado: Ajuste<boolean>;
  setArrastrando: Ajuste<boolean>;
  setLanzandoIdentificacion: Ajuste<boolean>;
}

// Lo que las acciones toman del render en curso: la lección, la escena, el router, las refs y
// los setters. Una acción que empieza en un render sigue con lo de ese render hasta acabar.
export interface EntornoEntrega extends AjustesEntrega {
  curso: string;
  numero: number;
  escena?: string;
  router: ReturnType<typeof useRouter>;
  refs: RefsEntrega;
}

type Lectura = Awaited<ReturnType<typeof leerEntregas>>;

type RefsLectura = Pick<RefsEntrega, "conocidas" | "vistasAlIdentificar" | "identificacionAdoptada">;

function conocer(refs: RefsLectura, leidas: Entregas) {
  for (const { archivo } of leidas.archivos) refs.conocidas.current.add(archivo);
  if (refs.identificacionAdoptada.current) {
    refs.identificacionAdoptada.current = false;
    for (const { archivo } of leidas.archivos) refs.vistasAlIdentificar.current.add(archivo);
  }
}

// Al desmontar se vacía la cola y se cortan las subidas en curso. Devuelve la limpieza del efecto.
export function vigilarMontaje(
  refs: Pick<RefsEntrega, "montado" | "cola" | "controles">,
): () => void {
  refs.montado.current = true;
  const controlesActivos = refs.controles.current;
  const enCola = refs.cola.current;
  return () => {
    refs.montado.current = false;
    enCola.length = 0;
    for (const control of controlesActivos.values()) control.abort();
  };
}

// Primera lectura de la lección. Devuelve la limpieza del efecto: lo que llegue después se ignora.
export function leerAlEntrar(
  curso: string,
  numero: number,
  refs: RefsLectura,
  ajustes: Pick<AjustesEntrega, "setEntregas" | "setErrorLectura">,
): () => void {
  let vivo = true;
  void leerEntregas(curso, numero).then(
    (resultado) => {
      if (!vivo) return;
      if (resultado.ok) {
        conocer(refs, resultado.entregas);
        ajustes.setEntregas(resultado.entregas);
        ajustes.setErrorLectura(null);
      } else {
        ajustes.setErrorLectura(resultado.mensaje);
      }
    },
    () => {
      if (vivo) ajustes.setErrorLectura(SIN_LEER);
    },
  );
  return () => {
    vivo = false;
  };
}

export async function recargar(
  entorno: EntornoEntrega,
  reiniciarSeleccion: boolean,
): Promise<Entregas | null> {
  let resultado: Lectura;
  try {
    resultado = await leerEntregas(entorno.curso, entorno.numero);
  } catch {
    resultado = { ok: false, mensaje: SIN_LEER };
  }
  if (!entorno.refs.montado.current) return null;
  if (resultado.ok) {
    conocer(entorno.refs, resultado.entregas);
    entorno.setEntregas(resultado.entregas);
    entorno.setErrorLectura(null);
    if (reiniciarSeleccion) entorno.setSeleccion({});
    return resultado.entregas;
  }
  entorno.setErrorLectura(resultado.mensaje);
  return null;
}

function actualizarSubida(entorno: EntornoEntrega, clave: number, cambios: Partial<Subida>) {
  entorno.setSubidas((actuales) =>
    actuales.map((subida) => (subida.clave === clave ? { ...subida, ...cambios } : subida)),
  );
}

export async function identificar(entorno: EntornoEntrega) {
  const { refs } = entorno;
  entorno.setMensaje(null);
  entorno.setLanzandoIdentificacion(true);
  for (const archivo of refs.conocidas.current) refs.vistasAlIdentificar.current.add(archivo);
  try {
    let resultado: Awaited<ReturnType<typeof lanzarAccion>>;
    try {
      resultado = await lanzarAccion(entorno.curso, entorno.numero, "identificar-tomas", {});
    } catch {
      // La Server Action no ha llegado a responder: un mensaje fijo, sin detalles internos.
      resultado = { ok: false, mensaje: SIN_LANZAR };
    }
    if (!refs.montado.current) return;
    if (!resultado.ok) {
      entorno.setMensaje(resultado.mensaje);
      await recargar(entorno, false);
      return;
    }
    entorno.setTrabajoIdentificar(resultado.trabajo);
    if (!enMarcha(resultado.trabajo)) await trasIdentificar(entorno, resultado.trabajo);
  } finally {
    entorno.setLanzandoIdentificacion(false);
  }
}

// Al terminar bien, si en entregas/ hay tomas fuera de la propuesta que ninguna identificación
// de esta visita ha visto (llegaron mientras se identificaba), se identifica otra vez. Las que
// ya se intentaron se quedan como «No se ha podido analizar»: no se repite en bucle.
// Mientras se lee, la zona y el botón siguen desactivados: si no, entre el final del trabajo
// y la lectura se podría lanzar otra identificación a la vez que la de aquí.
export async function trasIdentificar(entorno: EntornoEntrega, terminado: Trabajo) {
  entorno.setLanzandoIdentificacion(true);
  try {
    const leidas = await recargar(entorno, true);
    if (!leidas || !entorno.refs.montado.current || terminado.estado !== "hecho") return;
    const enPropuesta = new Set(
      (leidas.propuesta?.archivos ?? []).map(({ archivo }) => archivo),
    );
    const nuevas = leidas.archivos.some(
      ({ archivo }) =>
        !enPropuesta.has(archivo) && !entorno.refs.vistasAlIdentificar.current.has(archivo),
    );
    if (nuevas) await identificar(entorno);
  } finally {
    entorno.setLanzandoIdentificacion(false);
  }
}

// Empieza a subir una de la cola: su control para cancelarla y la fila en «subiendo».
function empezarSubida(entorno: EntornoEntrega, subida: Subida) {
  const control = new AbortController();
  entorno.refs.controles.current.set(subida.clave, control);
  actualizarSubida(entorno, subida.clave, { estado: "subiendo" });
  return subirEntrega({
    curso: entorno.curso,
    numero: entorno.numero,
    archivo: subida.archivo,
    alAvanzar: (fraccion) => actualizarSubida(entorno, subida.clave, { fraccion }),
    senal: control.signal,
  });
}

// Deja la fila como ha acabado la subida (con la zona aún montada) y dice si se ha subido.
function terminarSubida(entorno: EntornoEntrega, subida: Subida, resultado: ResultadoSubida) {
  if (resultado.ok) {
    entorno.refs.conocidas.current.add(subida.archivo.name);
    entorno.setSubidasAqui((anteriores) => [
      ...anteriores,
      { archivo: subida.archivo.name, escena: subida.escena },
    ]);
    actualizarSubida(entorno, subida.clave, { estado: "hecha", fraccion: 1 });
    return true;
  }
  actualizarSubida(entorno, subida.clave, {
    estado: resultado.cancelada ? "cancelada" : "error",
    mensaje: resultado.mensaje,
  });
  return false;
}

// Las subidas van de una en una: 4 GiB a la vez por el mismo disco no acaban antes. Un error
// de un archivo no corta los demás; al vaciarse la cola se identifica lo que se haya subido.
async function procesarCola(entorno: EntornoEntrega) {
  const { refs } = entorno;
  refs.procesando.current = true;
  let subidaAlguna = false;
  while (refs.cola.current.length > 0 && refs.montado.current) {
    const subida = refs.cola.current.shift() as Subida;
    if (refs.canceladas.current.has(subida.clave)) continue;
    const resultado = await empezarSubida(entorno, subida);
    refs.controles.current.delete(subida.clave);
    if (!refs.montado.current) break;
    if (terminarSubida(entorno, subida, resultado)) subidaAlguna = true;
  }
  refs.procesando.current = false;
  if (!refs.montado.current) return;
  if (subidaAlguna) {
    await identificar(entorno);
  } else {
    await recargar(entorno, false);
  }
}

export function anadir(entorno: EntornoEntrega, archivos: File[], entregaDesactivada: boolean) {
  const { refs } = entorno;
  if (archivos.length === 0 || entregaDesactivada) return;
  entorno.setMensaje(null);
  entorno.setColocadas(false);
  const nuevas: Subida[] = archivos.map((archivo) => ({
    clave: refs.siguienteClave.current++,
    archivo,
    escena: entorno.escena,
    estado: "esperando",
    fraccion: 0,
    mensaje: null,
  }));
  refs.cola.current.push(...nuevas);
  // Una tanda nueva aparta lo terminado de la anterior.
  entorno.setSubidas((actuales) => [
    ...(refs.procesando.current ? actuales : actuales.filter(enCurso)),
    ...nuevas,
  ]);
  if (!refs.procesando.current) void procesarCola(entorno);
}

export function cancelarSubida(entorno: EntornoEntrega, clave: number) {
  const control = entorno.refs.controles.current.get(clave);
  if (control) {
    control.abort();
    return;
  }
  entorno.refs.canceladas.current.add(clave);
  actualizarSubida(entorno, clave, { estado: "cancelada", mensaje: "Subida cancelada" });
}

export async function quitar(entorno: EntornoEntrega, archivo: string) {
  if (!window.confirm(`¿Quitar ${archivo}? Se borra de las tomas entregadas.`)) return;
  const { montado } = entorno.refs;
  entorno.setMensaje(null);
  entorno.setOcupado(true);
  try {
    let resultado: Awaited<ReturnType<typeof quitarEntrega>>;
    try {
      resultado = await quitarEntrega(entorno.curso, entorno.numero, archivo);
    } catch {
      resultado = { ok: false, mensaje: SIN_QUITAR };
    }
    if (!montado.current) return;
    if (!resultado.ok) entorno.setMensaje(resultado.mensaje);
    await recargar(entorno, false);
  } finally {
    if (montado.current) entorno.setOcupado(false);
  }
}

export async function colocar(
  entorno: EntornoEntrega,
  entregas: Entregas | null,
  asignaciones: AsignacionToma[],
) {
  if (!entregas) return;
  const avisos = avisosDeSustitucion(entregas, asignaciones);
  if (avisos.length > 0 && !window.confirm([...avisos, "¿Colocar las tomas?"].join("\n\n"))) {
    return;
  }
  const { montado } = entorno.refs;
  entorno.setMensaje(null);
  entorno.setColocadas(false);
  entorno.setOcupado(true);
  try {
    let resultado: Awaited<ReturnType<typeof colocarTomas>>;
    try {
      resultado = await colocarTomas(entorno.curso, entorno.numero, asignaciones);
    } catch {
      resultado = { ok: false, mensaje: SIN_COLOCAR };
    }
    if (!montado.current) return;
    if (!resultado.ok) {
      entorno.setMensaje(resultado.mensaje);
      return;
    }
    // El color de los ganchos no se ajusta aquí: es opcional y se pide gancho a gancho.
    entorno.setColocadas(true);
    await recargar(entorno, true);
    if (!montado.current) return;
    entorno.router.refresh();
  } finally {
    if (montado.current) entorno.setOcupado(false);
  }
}
