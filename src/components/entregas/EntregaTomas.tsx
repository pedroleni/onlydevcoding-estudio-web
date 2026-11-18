"use client";

import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { BOTON_CANCELAR, textoEstadoTrabajo } from "@/components/acciones/BotonAccion";
import { useSeguimientoTrabajo } from "@/components/acciones/useSeguimientoTrabajo";
import { subirEntrega } from "@/components/entregas/subirEntrega";
import { useAvisoAlSalir } from "@/components/teleprompter/useAvisoAlSalir";
import { colocarTomas, leerEntregas, quitarEntrega } from "@/lib/acciones-entregas";
import { lanzarAccion } from "@/lib/acciones-estudio";
import type {
  AsignacionToma,
  Entregas,
  EstadoAccion,
  IdAccion,
  TomaPropuesta,
  Trabajo,
} from "@/lib/tipos";

const ACEPTA = "video/quicktime,video/mp4,.mov,.mp4";
const MAXIMO_TEXTO = 140;
const CIERRE = "cierre";
// Mensajes fijos para cuando una Server Action no llega a responder: sin detalles internos.
const SIN_LANZAR = "No se han podido identificar las tomas. Vuelve a intentarlo.";
const SIN_LEER = "No se han podido leer las tomas entregadas. Vuelve a intentarlo.";
const SIN_QUITAR = "No se ha podido quitar la toma. Vuelve a intentarlo.";
const SIN_COLOCAR = "No se han podido colocar las tomas. Vuelve a intentarlo.";
const SIN_COLOR = "No se ha podido ajustar el color de los ganchos. Vuelve a intentarlo.";
const BOTON =
  "inline-flex min-h-11 cursor-pointer items-center justify-center border border-marca bg-carbon px-4 text-sm font-semibold text-texto transition-colors hover:enabled:bg-marca disabled:cursor-default disabled:opacity-40";
const BOTON_QUITAR =
  "inline-flex min-h-10 cursor-pointer items-center justify-center border border-borde px-3 text-sm font-semibold text-tenue transition-colors hover:enabled:border-rojo hover:enabled:text-rojo disabled:cursor-default disabled:opacity-40";

type EstadoSubida = "esperando" | "subiendo" | "hecha" | "error" | "cancelada";

interface Subida {
  clave: number;
  archivo: File;
  // Escena de cámara en la que estaba la zona al soltar el archivo.
  escena?: string;
  estado: EstadoSubida;
  fraccion: number;
  mensaje: string | null;
}

function enCurso(subida: Subida): boolean {
  return subida.estado === "esperando" || subida.estado === "subiendo";
}

function enMarcha(trabajo: Trabajo | null): boolean {
  return trabajo?.estado === "en_marcha";
}

function trabajoEnMarcha(acciones: EstadoAccion[] | null | undefined, id: IdAccion) {
  const ultimo = acciones?.find((accion) => accion.id === id)?.ultimo ?? null;
  return enMarcha(ultimo) ? ultimo : null;
}

function porcentaje(fraccion: number): number {
  return Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
}

function duracionLegible(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = String(total % 60).padStart(2, "0");
  return horas > 0
    ? `${horas}:${String(minutos).padStart(2, "0")}:${resto}`
    : `${minutos}:${resto}`;
}

function recorte(texto: string): string {
  const caracteres = Array.from(texto.trim());
  return caracteres.length > MAXIMO_TEXTO
    ? `${caracteres.slice(0, MAXIMO_TEXTO).join("")}…`
    : caracteres.join("");
}

function etiquetaDestino(id: string, titulo: string): string {
  return titulo && titulo !== id ? `${id} · ${titulo}` : id;
}

interface SubidaAqui {
  archivo: string;
  escena?: string;
}

// Destino con el que sale cada fila: el de la propuesta si sigue existiendo y, para una toma
// horizontal subida desde aquí en una escena del teleprompter que la propuesta deja sin destino,
// esa escena (la de cuando se soltó), si nadie más la tiene ya.
function seleccionInicial(
  entregas: Entregas,
  subidasAqui: readonly SubidaAqui[],
): Record<string, string> {
  const camara = new Set(entregas.destinos.camara.map(({ id }) => id));
  const ganchos = new Set(entregas.destinos.ganchos.map(({ id }) => id));
  const tomas = entregas.propuesta?.archivos ?? [];
  const resultado: Record<string, string> = {};
  const usados = new Set<string>();
  for (const toma of tomas) {
    const id = toma.propuesta?.id;
    const existe =
      id !== undefined && (toma.orientacion === "horizontal" ? camara.has(id) : ganchos.has(id));
    resultado[toma.archivo] = existe ? id : "";
    if (existe) usados.add(id);
  }
  for (const { archivo, escena } of subidasAqui) {
    if (!escena || !camara.has(escena) || usados.has(escena)) continue;
    const sinDestino = tomas.find(
      (toma) =>
        toma.archivo === archivo &&
        toma.orientacion === "horizontal" &&
        toma.propuesta === null &&
        !resultado[toma.archivo],
    );
    if (sinDestino) {
      resultado[sinDestino.archivo] = escena;
      usados.add(escena);
    }
  }
  return resultado;
}

function avisosDeSustitucion(entregas: Entregas, asignaciones: AsignacionToma[]): string[] {
  const avisos: string[] = [];
  for (const { destino } of asignaciones) {
    if (!destino) continue;
    const escena = entregas.destinos.camara.find(({ id }) => id === destino);
    if (escena?.tiene_toma) {
      avisos.push(
        `${escena.id} ya tiene una toma: la nueva la sustituye (la anterior se guarda en anteriores/) y se pierden las animaciones puestas sobre ella.`,
      );
      continue;
    }
    const gancho = entregas.destinos.ganchos.find(({ id }) => id === destino);
    if (gancho?.entregado) {
      avisos.push(
        `${gancho.id} ya tiene una toma: la nueva la sustituye (la anterior se guarda en anteriores/).`,
      );
    }
  }
  return avisos;
}

function EstadoTrabajo({
  trabajo,
  enCursoTexto,
  hechoTexto,
  etiqueta,
}: {
  trabajo: Trabajo | null;
  enCursoTexto: string;
  hechoTexto: string | null;
  etiqueta: string;
}) {
  if (!trabajo) return null;
  if (trabajo.estado === "en_marcha") {
    const avance = porcentaje(trabajo.progreso);
    return (
      <p role="status" className="m-0 text-sm text-tenue">
        {avance > 0 ? `${enCursoTexto}… ${avance} %` : `${enCursoTexto}…`}
      </p>
    );
  }
  if (trabajo.estado === "hecho") {
    return hechoTexto ? (
      <p role="status" className="m-0 text-sm text-verde">{hechoTexto}</p>
    ) : null;
  }
  return (
    <p role="status" className="m-0 text-sm text-ambar">
      {`${etiqueta}: ${textoEstadoTrabajo(trabajo)}`}
    </p>
  );
}

function FilaSubida({ subida, alCancelar }: { subida: Subida; alCancelar: () => void }) {
  const nombre = subida.archivo.name;
  const avance = porcentaje(subida.fraccion);
  return (
    <li className="grid gap-2 border border-borde bg-fondo p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 break-all font-mono text-xs">{nombre}</span>
        {enCurso(subida) ? (
          <button
            type="button"
            className={BOTON_CANCELAR}
            aria-label={`Cancelar la subida de ${nombre}`}
            onClick={alCancelar}
          >
            Cancelar
          </button>
        ) : null}
      </div>
      {enCurso(subida) ? (
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-label={`Subida de ${nombre}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={avance}
            className="h-2 min-w-0 flex-1 bg-superficie"
          >
            <div className="h-full bg-marca" style={{ width: `${avance}%` }} />
          </div>
          <span className="shrink-0 text-tenue">
            {subida.estado === "esperando" ? "En cola" : `${avance} %`}
          </span>
        </div>
      ) : subida.estado === "hecha" ? (
        <span className="text-verde">Subida</span>
      ) : subida.estado === "error" ? (
        <p role="alert" className="m-0 text-ambar">{subida.mensaje}</p>
      ) : (
        <span className="text-tenue">{subida.mensaje ?? "Subida cancelada"}</span>
      )}
    </li>
  );
}

function FilaToma({
  toma,
  entregas,
  valor,
  bloqueada,
  alCambiar,
  alQuitar,
}: {
  toma: TomaPropuesta;
  entregas: Entregas;
  valor: string;
  bloqueada: boolean;
  alCambiar: (valor: string) => void;
  alQuitar: () => void;
}) {
  const horizontal = toma.orientacion === "horizontal";
  return (
    <li className="grid gap-3 border border-borde bg-fondo p-4 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <span className="break-all font-mono text-xs">{toma.archivo}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-tenue">
            <span>{horizontal ? "Horizontal" : "Vertical"}</span>
            <span>{duracionLegible(toma.duracion)}</span>
            {toma.repite ? <span className="text-ambar">{`Repetida de ${toma.repite.id}`}</span> : null}
          </span>
        </div>
        <button
          type="button"
          className={BOTON_QUITAR}
          aria-label={`Quitar ${toma.archivo}`}
          disabled={bloqueada}
          onClick={alQuitar}
        >
          Quitar
        </button>
      </div>
      {toma.texto.trim() ? (
        <p className="m-0 break-words text-tenue">{recorte(toma.texto)}</p>
      ) : null}
      <label className="grid gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-tenue">Destino</span>
        <select
          aria-label={`Destino de ${toma.archivo}`}
          className="min-h-11 w-full max-w-md border border-borde bg-superficie px-3 text-texto"
          value={valor}
          disabled={bloqueada}
          onChange={(evento) => alCambiar(evento.target.value)}
        >
          <option value="">No usar</option>
          {horizontal
            ? entregas.destinos.camara.map(({ id, titulo }) => (
                <option key={id} value={id}>{etiquetaDestino(id, titulo)}</option>
              ))
            : entregas.destinos.ganchos.map(({ id, titulo }) => (
                <option key={id} value={id}>{etiquetaDestino(id, titulo)}</option>
              ))}
          {horizontal ? null : <option value={CIERRE}>Cierre</option>}
        </select>
      </label>
    </li>
  );
}

export function EntregaTomas({
  curso,
  numero,
  escena,
  acciones,
  alCambiarSubiendo,
}: {
  curso: string;
  numero: number;
  // Escena de cámara del teleprompter en la que está la zona.
  escena?: string;
  // Estado de las acciones de la lección, para seguir una identificación o un color en marcha.
  acciones?: EstadoAccion[] | null;
  // Avisa de si hay alguna subida en curso (el teleprompter pregunta antes de cambiar de lección).
  alCambiarSubiendo?: (subiendo: boolean) => void;
}) {
  const router = useRouter();
  const [entregas, setEntregas] = useState<Entregas | null>(null);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);
  const [subidas, setSubidas] = useState<Subida[]>([]);
  const [subidasAqui, setSubidasAqui] = useState<SubidaAqui[]>([]);
  const [seleccion, setSeleccion] = useState<Record<string, string>>({});
  const [trabajoIdentificar, setTrabajoIdentificar] = useState<Trabajo | null>(() =>
    trabajoEnMarcha(acciones, "identificar-tomas"),
  );
  const [trabajoColor, setTrabajoColor] = useState<Trabajo | null>(() =>
    trabajoEnMarcha(acciones, "color-ganchos"),
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
  // Archivos de entregas/ que se conocen (leídos o subidos desde aquí) y los que ya han entrado
  // en una identificación de esta visita: al terminar, solo se repite por los que no.
  const conocidas = useRef(new Set<string>());
  const vistasAlIdentificar = useRef(new Set<string>());
  // Si al llegar ya había una identificación en marcha, lo que se lea primero entra en ella.
  const identificacionAdoptada = useRef(trabajoIdentificar !== null);

  const subiendo = subidas.some(enCurso);
  useAvisoAlSalir(subiendo);

  const avisarSubiendo = useEffectEvent((valor: boolean) => {
    alCambiarSubiendo?.(valor);
  });
  useEffect(() => {
    avisarSubiendo(subiendo);
  }, [subiendo]);

  useEffect(() => {
    montado.current = true;
    const controlesActivos = controles.current;
    const enCola = cola.current;
    return () => {
      montado.current = false;
      enCola.length = 0;
      for (const control of controlesActivos.values()) control.abort();
    };
  }, []);

  function conocer(leidas: Entregas) {
    for (const { archivo } of leidas.archivos) conocidas.current.add(archivo);
    if (identificacionAdoptada.current) {
      identificacionAdoptada.current = false;
      for (const { archivo } of leidas.archivos) vistasAlIdentificar.current.add(archivo);
    }
  }

  useEffect(() => {
    let vivo = true;
    void leerEntregas(curso, numero).then(
      (resultado) => {
        if (!vivo) return;
        if (resultado.ok) {
          conocer(resultado.entregas);
          setEntregas(resultado.entregas);
          setErrorLectura(null);
        } else {
          setErrorLectura(resultado.mensaje);
        }
      },
      () => {
        if (vivo) setErrorLectura(SIN_LEER);
      },
    );
    return () => {
      vivo = false;
    };
  }, [curso, numero]);

  async function recargar(reiniciarSeleccion: boolean): Promise<Entregas | null> {
    let resultado: Awaited<ReturnType<typeof leerEntregas>>;
    try {
      resultado = await leerEntregas(curso, numero);
    } catch {
      resultado = { ok: false, mensaje: SIN_LEER };
    }
    if (!montado.current) return null;
    if (resultado.ok) {
      conocer(resultado.entregas);
      setEntregas(resultado.entregas);
      setErrorLectura(null);
      if (reiniciarSeleccion) setSeleccion({});
      return resultado.entregas;
    }
    setErrorLectura(resultado.mensaje);
    return null;
  }

  const identificacion = useSeguimientoTrabajo({
    trabajo: trabajoIdentificar,
    alTerminar: (terminado) => {
      void trasIdentificar(terminado);
    },
    // Tras reiniciar la API el trabajo ya no existe: no se espera más y se lee lo que haya.
    alDesaparecer: () => {
      setTrabajoIdentificar(null);
      void recargar(true);
    },
    refrescarAlTerminar: false,
  });
  const color = useSeguimientoTrabajo({
    trabajo: trabajoColor,
    alDesaparecer: () => {
      setTrabajoColor(null);
      void recargar(false);
    },
  });
  const identificando = enMarcha(identificacion);
  // Mientras se identifica no se entregan más: lo nuevo no entraría en esta identificación.
  const entregaDesactivada = identificando || lanzandoIdentificacion;

  function actualizarSubida(clave: number, cambios: Partial<Subida>) {
    setSubidas((actuales) =>
      actuales.map((subida) => (subida.clave === clave ? { ...subida, ...cambios } : subida)),
    );
  }

  async function identificar() {
    setMensaje(null);
    setLanzandoIdentificacion(true);
    for (const archivo of conocidas.current) vistasAlIdentificar.current.add(archivo);
    try {
      let resultado: Awaited<ReturnType<typeof lanzarAccion>>;
      try {
        resultado = await lanzarAccion(curso, numero, "identificar-tomas", {});
      } catch {
        // La Server Action no ha llegado a responder: un mensaje fijo, sin detalles internos.
        resultado = { ok: false, mensaje: SIN_LANZAR };
      }
      if (!montado.current) return;
      if (!resultado.ok) {
        setMensaje(resultado.mensaje);
        await recargar(false);
        return;
      }
      setTrabajoIdentificar(resultado.trabajo);
      if (!enMarcha(resultado.trabajo)) await trasIdentificar(resultado.trabajo);
    } finally {
      setLanzandoIdentificacion(false);
    }
  }

  // Al terminar bien, si en entregas/ hay tomas fuera de la propuesta que ninguna identificación
  // de esta visita ha visto (llegaron mientras se identificaba), se identifica otra vez. Las que
  // ya se intentaron se quedan como «No se ha podido analizar»: no se repite en bucle.
  // Mientras se lee, la zona y el botón siguen desactivados: si no, entre el final del trabajo
  // y la lectura se podría lanzar otra identificación a la vez que la de aquí.
  async function trasIdentificar(terminado: Trabajo) {
    setLanzandoIdentificacion(true);
    try {
      const leidas = await recargar(true);
      if (!leidas || !montado.current || terminado.estado !== "hecho") return;
      const enPropuesta = new Set(
        (leidas.propuesta?.archivos ?? []).map(({ archivo }) => archivo),
      );
      const nuevas = leidas.archivos.some(
        ({ archivo }) => !enPropuesta.has(archivo) && !vistasAlIdentificar.current.has(archivo),
      );
      if (nuevas) await identificar();
    } finally {
      setLanzandoIdentificacion(false);
    }
  }

  // Las subidas van de una en una: 4 GiB a la vez por el mismo disco no acaban antes. Un error
  // de un archivo no corta los demás; al vaciarse la cola se identifica lo que se haya subido.
  async function procesarCola() {
    procesando.current = true;
    let subidaAlguna = false;
    while (cola.current.length > 0 && montado.current) {
      const subida = cola.current.shift() as Subida;
      if (canceladas.current.has(subida.clave)) continue;
      const control = new AbortController();
      controles.current.set(subida.clave, control);
      actualizarSubida(subida.clave, { estado: "subiendo" });
      const resultado = await subirEntrega(
        curso,
        numero,
        subida.archivo,
        (fraccion) => actualizarSubida(subida.clave, { fraccion }),
        control.signal,
      );
      controles.current.delete(subida.clave);
      if (!montado.current) break;
      if (resultado.ok) {
        subidaAlguna = true;
        conocidas.current.add(subida.archivo.name);
        setSubidasAqui((anteriores) => [
          ...anteriores,
          { archivo: subida.archivo.name, escena: subida.escena },
        ]);
        actualizarSubida(subida.clave, { estado: "hecha", fraccion: 1 });
      } else {
        actualizarSubida(subida.clave, {
          estado: resultado.cancelada ? "cancelada" : "error",
          mensaje: resultado.mensaje,
        });
      }
    }
    procesando.current = false;
    if (!montado.current) return;
    if (subidaAlguna) {
      await identificar();
    } else {
      await recargar(false);
    }
  }

  function anadir(archivos: File[]) {
    if (archivos.length === 0 || entregaDesactivada) return;
    setMensaje(null);
    setColocadas(false);
    const nuevas: Subida[] = archivos.map((archivo) => ({
      clave: siguienteClave.current++,
      archivo,
      escena,
      estado: "esperando",
      fraccion: 0,
      mensaje: null,
    }));
    cola.current.push(...nuevas);
    // Una tanda nueva aparta lo terminado de la anterior.
    setSubidas((actuales) => [
      ...(procesando.current ? actuales : actuales.filter(enCurso)),
      ...nuevas,
    ]);
    if (!procesando.current) void procesarCola();
  }

  function cancelarSubida(clave: number) {
    const control = controles.current.get(clave);
    if (control) {
      control.abort();
      return;
    }
    canceladas.current.add(clave);
    actualizarSubida(clave, { estado: "cancelada", mensaje: "Subida cancelada" });
  }

  const tomas = entregas?.propuesta?.archivos ?? [];
  const analizadas = new Set(tomas.map(({ archivo }) => archivo));
  const sinAnalizar = (entregas?.archivos ?? []).filter(({ archivo }) => !analizadas.has(archivo));
  const inicial = entregas ? seleccionInicial(entregas, subidasAqui) : {};
  const valorDe = (archivo: string) => seleccion[archivo] ?? inicial[archivo] ?? "";
  const asignaciones: AsignacionToma[] = tomas.map(({ archivo }) => ({
    archivo,
    destino: valorDe(archivo) || null,
  }));
  // Mientras se lanza o sigue una identificación, o se ajusta el color, la propuesta puede
  // cambiar o los ganchos están en uso: no se quita ni se coloca nada.
  const bloqueada =
    ocupado || subiendo || identificando || lanzandoIdentificacion || enMarcha(color);
  const textoSinAnalizar = identificando
    ? "Pendiente de identificar"
    : entregas?.propuesta
      ? "No se ha podido analizar"
      : "Sin identificar";

  async function quitar(archivo: string) {
    if (!window.confirm(`¿Quitar ${archivo}? Se borra de las tomas entregadas.`)) return;
    setMensaje(null);
    setOcupado(true);
    try {
      let resultado: Awaited<ReturnType<typeof quitarEntrega>>;
      try {
        resultado = await quitarEntrega(curso, numero, archivo);
      } catch {
        resultado = { ok: false, mensaje: SIN_QUITAR };
      }
      if (!montado.current) return;
      if (!resultado.ok) setMensaje(resultado.mensaje);
      await recargar(false);
    } finally {
      if (montado.current) setOcupado(false);
    }
  }

  async function colocar() {
    if (!entregas) return;
    const avisos = avisosDeSustitucion(entregas, asignaciones);
    if (avisos.length > 0 && !window.confirm([...avisos, "¿Colocar las tomas?"].join("\n\n"))) {
      return;
    }
    setMensaje(null);
    setColocadas(false);
    setOcupado(true);
    try {
      let resultado: Awaited<ReturnType<typeof colocarTomas>>;
      try {
        resultado = await colocarTomas(curso, numero, asignaciones);
      } catch {
        resultado = { ok: false, mensaje: SIN_COLOCAR };
      }
      if (!montado.current) return;
      if (!resultado.ok) {
        setMensaje(resultado.mensaje);
        return;
      }
      setColocadas(true);
      if (resultado.resultado.ganchos > 0) {
        let lanzado: Awaited<ReturnType<typeof lanzarAccion>>;
        try {
          lanzado = await lanzarAccion(curso, numero, "color-ganchos", {});
        } catch {
          lanzado = { ok: false, mensaje: SIN_COLOR };
        }
        if (!montado.current) return;
        if (lanzado.ok) setTrabajoColor(lanzado.trabajo);
        else setMensaje(lanzado.mensaje);
      }
      await recargar(true);
      if (!montado.current) return;
      router.refresh();
    } finally {
      if (montado.current) setOcupado(false);
    }
  }

  return (
    <section aria-label="Entregar las tomas de cámara" className="grid gap-4">
      <label
        className={`grid justify-items-center gap-1 border border-dashed p-6 text-center transition-colors ${
          entregaDesactivada
            ? "cursor-default border-borde bg-superficie opacity-60"
            : `cursor-pointer focus-within:border-marca hover:border-marca ${
                arrastrando ? "border-marca bg-carbon" : "border-borde bg-superficie"
              }`
        }`}
        onDragOver={(evento) => {
          evento.preventDefault();
          if (!entregaDesactivada) setArrastrando(true);
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setArrastrando(false);
          anadir(Array.from(evento.dataTransfer.files));
        }}
      >
        <input
          type="file"
          multiple
          accept={ACEPTA}
          disabled={entregaDesactivada}
          className="sr-only"
          onChange={(evento) => {
            anadir(Array.from(evento.target.files ?? []));
            evento.target.value = "";
          }}
        />
        <span className="font-semibold">⬆ Entregar los vídeos de la cámara</span>
        <span className="text-sm text-tenue">
          {entregaDesactivada
            ? "Espera a que se identifiquen las tomas para entregar más."
            : "Arrastra aquí las tomas (Facetune, iPhone…)"}
        </span>
      </label>

      {subidas.length > 0 ? (
        <ul className="grid gap-2" aria-label="Subidas">
          {subidas.map((subida) => (
            <FilaSubida
              key={subida.clave}
              subida={subida}
              alCancelar={() => cancelarSubida(subida.clave)}
            />
          ))}
        </ul>
      ) : null}

      <EstadoTrabajo
        trabajo={identificacion}
        enCursoTexto="Identificando las tomas"
        hechoTexto={null}
        etiqueta="Identificar las tomas"
      />

      {errorLectura ? (
        <p role="alert" className="m-0 text-sm text-ambar">{errorLectura}</p>
      ) : null}

      {tomas.length > 0 || sinAnalizar.length > 0 ? (
        <div className="grid gap-3">
          <h3 className="m-0 text-base font-semibold">Tomas entregadas</h3>
          <ul className="grid gap-3">
            {tomas.map((toma) => (
              <FilaToma
                key={toma.archivo}
                toma={toma}
                entregas={entregas as Entregas}
                valor={valorDe(toma.archivo)}
                bloqueada={bloqueada}
                alCambiar={(valor) =>
                  setSeleccion((actual) => ({ ...actual, [toma.archivo]: valor }))
                }
                alQuitar={() => void quitar(toma.archivo)}
              />
            ))}
            {sinAnalizar.map(({ archivo }) => (
              <li
                key={archivo}
                className="flex flex-wrap items-start justify-between gap-3 border border-borde bg-fondo p-4 text-sm"
              >
                <div className="grid min-w-0 gap-1">
                  <span className="break-all font-mono text-xs">{archivo}</span>
                  <span className="text-ambar">{textoSinAnalizar}</span>
                </div>
                <button
                  type="button"
                  className={BOTON_QUITAR}
                  aria-label={`Quitar ${archivo}`}
                  disabled={bloqueada}
                  onClick={() => void quitar(archivo)}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            {tomas.length > 0 ? (
              <button
                type="button"
                className={BOTON}
                disabled={bloqueada || asignaciones.every(({ destino }) => destino === null)}
                onClick={() => void colocar()}
              >
                Colocar las tomas
              </button>
            ) : null}
            {sinAnalizar.length > 0 && !identificando && !subiendo ? (
              <button
                type="button"
                className={BOTON}
                disabled={ocupado || lanzandoIdentificacion}
                onClick={() => void identificar()}
              >
                Identificar las tomas
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {mensaje ? (
        <p role="alert" className="m-0 text-sm text-ambar">{mensaje}</p>
      ) : null}
      {colocadas ? (
        <p role="status" className="m-0 text-sm text-verde">Tomas colocadas.</p>
      ) : null}
      <EstadoTrabajo
        trabajo={color}
        enCursoTexto="Ajustando el color de los ganchos"
        hechoTexto="Color de los ganchos ajustado."
        etiqueta="Ajustar el color de los ganchos"
      />
    </section>
  );
}
