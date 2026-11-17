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
  type OpcionLeccion,
} from "@/components/teleprompter/BarraAjustes";
import { BarraEscenas } from "@/components/teleprompter/BarraEscenas";
import { EditorTextos } from "@/components/teleprompter/EditorTextos";
import { PanelPrevia } from "@/components/teleprompter/PanelPrevia";
import { PieControles, type EventoToma } from "@/components/teleprompter/PieControles";
import {
  colocarVideo,
  iniciosDeFrases,
  seguirLectura,
  seguirToma,
} from "@/components/teleprompter/sincroniaPrevia";
import { TextoConRitmo } from "@/components/teleprompter/TextoConRitmo";
import { ponerTexto, useLectura } from "@/components/teleprompter/useLectura";
import { useSeguimientoPrevia } from "@/components/teleprompter/useSeguimientoPrevia";
import { mensaje, useSesionGrabacion } from "@/components/teleprompter/useSesionGrabacion";
import { urlMedio } from "@/lib/medios";
import {
  guardarPreferencias,
  leerPreferencias,
  usePreferencias,
  type Preferencias,
} from "@/lib/teleprompter/preferencias";
import { calcularPlan, mmss, type Plan } from "@/lib/teleprompter/ritmo";
import { textoLegible } from "@/lib/texto-legible";
import type { EscenaTeleprompter, Teleprompter as DatosTeleprompter } from "@/lib/tipos";

export type { OpcionLeccion };

type Seleccion = { curso: string; numero: number };

const urlTeleprompter = ({ curso, numero }: Seleccion) =>
  `/teleprompter?curso=${encodeURIComponent(curso)}&leccion=${numero}`;

const planDe = (escena: EscenaTeleprompter, ritmo: number): Plan =>
  calcularPlan(
    escena.cues.map((cue) => ({ texto: cue.texto, pausa: cue.pausa ?? 0 })),
    ritmo,
  );

type VistaCamara = Preferencias["vistaCamara"];

function estadoInicial(
  escena: EscenaTeleprompter | undefined,
  grabada: boolean,
  vistaCamara: VistaCamara,
): string {
  if (!escena) return "Listo.";
  if (escena.modo === "voz") {
    return grabada
      ? `Ya grabada: ${escena.id}.wav (puedes repetirla).`
      : "Pulsa Grabar cuando estés listo.";
  }
  return vistaCamara === "puntos"
    ? "Empezar pone en marcha el cronómetro."
    : "Pulsa Empezar y dale a grabar en tu cámara durante la cuenta atrás.";
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
  // El guion con el que se trabaja: el de la página o, tras guardar un texto, el que devuelve
  // la API (con su versión nueva) sin esperar a que se refresque la página.
  const [guion, setGuion] = useState(datos);
  const [datosAnteriores, setDatosAnteriores] = useState(datos);
  if (datos !== datosAnteriores) {
    setDatosAnteriores(datos);
    setGuion(datos);
  }
  const escenas = useMemo(
    () => guion.escenas.filter(({ modo }) => (modo as string) !== "animacion"),
    [guion.escenas],
  );
  // Se abre en la primera escena de voz sin grabar.
  const [indice, setIndice] = useState(() => {
    const pendiente = escenas.findIndex(({ modo, grabada }) => modo === "voz" && !grabada);
    return pendiente >= 0 ? pendiente : 0;
  });
  const escena = escenas.at(indice);
  const voz = escena?.modo === "voz";
  const puntos = !voz && pref.vistaCamara === "puntos";
  // null: el estado inicial de la escena, que se calcula al pintar con las preferencias ya
  // leídas (tras hidratar), así que la vista «puntos» guardada se refleja desde el principio.
  const [estadoPropio, setEstado] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const plan = useMemo(() => (escena ? planDe(escena, pref.ritmo) : null), [escena, pref.ritmo]);

  const prompterRef = useRef<HTMLDivElement>(null);
  const relojRef = useRef<HTMLSpanElement>(null);
  const nivelRef = useRef<HTMLSpanElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bucleTomaRef = useRef(0);
  const lectura = useLectura({ prompterRef, relojRef });
  const sesion = useSesionGrabacion({
    curso: guion.curso,
    numero: guion.numero,
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
  const { tomas, pendientes, guardando, micros } = sesion;
  const ocupado = enMarcha || guardando;
  const bloqueado = ocupado || editando;
  const grabadas = useMemo(
    () =>
      new Set([
        ...escenas.filter(({ grabada }) => grabada).map(({ id }) => id),
        ...Object.keys(tomas),
      ]),
    [escenas, tomas],
  );
  const estado =
    estadoPropio ??
    estadoInicial(escena, Boolean(escena && grabadas.has(escena.id)), pref.vistaCamara);
  const montaje = guion.montaje;
  const escenaMontajeDe = (id: string | undefined) =>
    montaje?.escenas.find((candidata) => candidata.id === id);

  useEffect(() => () => cancelAnimationFrame(bucleTomaRef.current), []);

  // ---------- vista previa ----------
  function colocarPrevia(id: string | undefined) {
    if (montaje) colocarVideo(videoRef.current, escenaMontajeDe(id), montaje.fps);
  }

  function alEventoToma(audio: HTMLAudioElement, evento: EventoToma) {
    cancelAnimationFrame(bucleTomaRef.current);
    const escenaMontaje = escenaMontajeDe(escena?.id);
    if (!montaje || !escenaMontaje) return;
    const acompanar = () => {
      if (!lectura.enMarchaAhora()) {
        seguirToma(videoRef.current, audio, escenaMontaje, montaje.fps);
      }
    };
    if (evento === "parada") {
      acompanar();
      return;
    }
    const paso = () => {
      acompanar();
      if (!audio.paused) bucleTomaRef.current = requestAnimationFrame(paso);
    };
    paso();
  }

  // ---------- teleprompter ----------
  function pararTodo(limpiar: boolean) {
    lectura.pararTodo(limpiar);
    videoRef.current?.pause();
  }

  function mostrarEscena(i: number) {
    if (escenas.length === 0) return;
    pararTodo(true);
    cancelAnimationFrame(bucleTomaRef.current);
    const nuevo = Math.max(0, Math.min(escenas.length - 1, i));
    setIndice(nuevo);
    setEstado(null);
    ponerTexto(relojRef.current, "0:00");
    prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
    colocarPrevia(escenas[nuevo].id);
  }

  function empezarAnimacion(actualEscena: EscenaTeleprompter) {
    const planActual = planDe(actualEscena, leerPreferencias().ritmo);
    const escenaMontaje = escenaMontajeDe(actualEscena.id);
    const iniciosFrases = iniciosDeFrases(planActual, actualEscena.cues.length);
    lectura.animar(planActual, {
      margen: () => (sesion.grabandoAhora() ? Math.max(15, planActual.total * 0.5) : 1.5),
      alFotograma: (t) => {
        if (!montaje || !escenaMontaje) return;
        seguirLectura(videoRef.current, {
          t,
          plan: planActual,
          escenaMontaje,
          fps: montaje.fps,
          iniciosFrases,
        });
      },
      alTerminar: () => void terminar(actualEscena),
    });
  }

  async function terminar(actualEscena: EscenaTeleprompter) {
    if (sesion.grabandoAhora()) {
      lectura.detener();
      await sesion.pararGrabacion(actualEscena.id);
    }
    pararTodo(false);
  }

  async function arrancar(conGrabacion: boolean) {
    const actualEscena = escena;
    if (!actualEscena || editando || sesion.guardandoAhora() || sesion.cerrada()) return;
    const ejecucion = lectura.empezar();
    if (!ejecucion) return;
    const { sigue } = ejecucion;
    cancelAnimationFrame(bucleTomaRef.current);

    if (actualEscena.modo !== "voz") {
      // Con los puntos a la vista no hay texto que seguir: solo corre el cronómetro.
      if (leerPreferencias().vistaCamara === "puntos") {
        setEstado("Cronómetro en marcha.");
        return;
      }
      await lectura.cuentaAtras(
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
        flujo = await sesion.abrirMicroConNivel();
      } catch (error) {
        if (sesion.cerrada()) return;
        setEstado(`No se puede usar el micrófono: ${mensaje(error)}`);
        if (ejecucion.vigente()) pararTodo(true);
        return;
      }
      // Si se paró mientras el navegador pedía el permiso, esta ejecución ya no graba:
      // el flujo se queda abierto para la siguiente y la grabadora solo la crea la ejecución viva.
      if (!sigue()) return;
      sesion.empezarGrabacion(flujo);
      await lectura.cuentaAtras(
        [
          ["Silencio", "dos segundos sin hablar ni moverte (sirve para limpiar el ruido)", 2000],
          ["3", "empieza cuando se ilumine la primera palabra", 700],
          ["2", "", 700],
          ["1", "", 700],
        ],
        sigue,
      );
    } else {
      await lectura.cuentaAtras(
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
    if (sesion.guardandoAhora()) return;
    if (sesion.grabandoAhora() && escena) {
      lectura.detener();
      await sesion.pararGrabacion(escena.id);
    } else if (sesion.abriendoAhora() && escena) {
      // Aún no se graba nada: se deja de esperar al permiso y no se pierde ninguna toma.
      setEstado(null);
    }
    pararTodo(false);
  }

  async function repetir() {
    if (sesion.guardandoAhora()) return;
    if (sesion.grabandoAhora() && escena) {
      lectura.detener();
      await sesion.pararGrabacion(escena.id, true);
    }
    mostrarEscena(indice);
    void arrancar(voz);
  }

  function reintentar() {
    if (lectura.enMarchaAhora()) return;
    void sesion.reintentar();
  }

  function cambiarRitmo(ritmo: number) {
    guardarPreferencias({ ritmo });
    if (!enMarcha && !editando) mostrarEscena(indice);
  }

  function cambiarVista() {
    if (editando) return;
    guardarPreferencias({
      vistaCamara: leerPreferencias().vistaCamara === "puntos" ? "guion" : "puntos",
    });
    mostrarEscena(indice);
  }

  function cambiarLeccion(valor: string) {
    if (bloqueado) return;
    if (pendientes.length > 0 && !window.confirm("Hay una toma sin guardar. ¿Descartarla?")) {
      return;
    }
    alCambiarLeccion(valor);
  }

  // ---------- edición del texto ----------
  function editar() {
    if (!escena || lectura.enMarchaAhora() || sesion.guardandoAhora()) return;
    pararTodo(true);
    setEditando(true);
    setEstado("Corrige el texto y pulsa Guardar texto.");
    prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
  }

  function alGuardarTexto(nuevo: DatosTeleprompter) {
    setGuion(nuevo);
    setEditando(false);
    setEstado("Texto guardado en el guion.");
    ponerTexto(relojRef.current, "0:00");
    prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
  }

  function cancelarEdicion() {
    setEditando(false);
    mostrarEscena(indice);
  }

  // ---------- teclado ----------
  const alPulsarTecla = useEffectEvent((evento: KeyboardEvent) => {
    if (editando) return;
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
        : `${puntos ? "objetivo " : ""}≈ ${mmss(plan.total)} · se graba con tu cámara: ${escena.id}.mov`
      : "";
  const conPrevia = pref.tamPrevia > 0;
  // El texto se aparta a la izquierda del panel (solo en pantallas anchas, donde flota).
  const apartado = conPrevia ? "md:pr-[calc(var(--ancho-previa)+72px)]" : "";

  return (
    <div className="flex flex-col md:h-[calc(100dvh-4rem-1px)]">
      <BarraAjustes
        lecciones={lecciones}
        leccion={valorLeccion(guion)}
        alCambiarLeccion={cambiarLeccion}
        bloqueada={bloqueado}
        ritmo={pref.ritmo}
        alCambiarRitmo={cambiarRitmo}
        letra={pref.letra}
        alCambiarLetra={(letra) => guardarPreferencias({ letra })}
        micro={pref.micro}
        micros={micros}
        alCambiarMicro={(micro) => void sesion.cambiarMicro(micro)}
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
          if (!bloqueado) mostrarEscena(i);
        }}
      />

      {escena ? (
        <div
          style={{ "--ancho-previa": `${pref.tamPrevia}px` } as CSSProperties}
          className="relative flex min-h-0 flex-1 flex-col"
        >
          <div
            className={`flex flex-wrap items-baseline gap-x-4 gap-y-2 px-4 pt-[18px] md:px-12 ${apartado}`}
          >
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
            {voz ? null : (
              <span className="text-sm text-ambar">🎥 Se graba con la cámara · horizontal</span>
            )}
          </div>
          {!voz && !puntos && !editando && escena.puntos.length > 0 ? (
            <ul
              className={`mx-4 mt-3.5 list-disc rounded-xl border border-borde bg-superficie py-2.5 pr-[18px] pl-[34px] text-[17px] leading-[1.45] text-ambar md:mx-12 ${
                conPrevia ? "md:mr-[calc(var(--ancho-previa)+72px)]" : ""
              }`}
            >
              {escena.puntos.map((punto, i) => (
                <li key={i} className="[&+li]:mt-0.5">
                  {punto}
                </li>
              ))}
            </ul>
          ) : null}
          {conPrevia ? (
            <PanelPrevia
              previa={guion.previa}
              seguimiento={seguimiento}
              montaje={montaje}
              escena={escena.id}
              videoRef={videoRef}
              alCargarVideo={() => {
                if (!lectura.enMarchaAhora()) colocarPrevia(escena.id);
              }}
            />
          ) : null}
          <div
            ref={prompterRef}
            data-testid="prompter"
            data-con-previa={conPrevia ? "" : undefined}
            style={{ "--letra": `${pref.letra}px` } as CSSProperties}
            className={`relative h-[60dvh] overflow-y-auto scroll-smooth px-4 motion-reduce:scroll-auto md:h-auto md:min-h-0 md:flex-1 md:px-12 ${apartado}`}
          >
            {/* El margen va dentro: en el propio contenedor impediría que encogiera a su hueco. */}
            {editando ? (
              <div className="pt-4 pb-[40vh]">
                <EditorTextos
                  key={escena.id}
                  curso={guion.curso}
                  numero={guion.numero}
                  version={guion.version}
                  escena={escena}
                  alGuardado={alGuardarTexto}
                  alCancelar={cancelarEdicion}
                />
              </div>
            ) : puntos ? (
              // Los puntos se leen de un vistazo: arriba, sin desplazarse.
              <div className="pt-[5vh] pb-[20vh]">
                <ul className="mx-auto max-w-[34ch] list-disc pl-[1.2em] text-[calc(var(--letra)*0.8)] leading-[1.4] font-semibold">
                  {escena.puntos.map((punto, i) => (
                    <li key={i} className="mb-[0.7em]">
                      {punto}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="pt-[32vh] pb-[60vh]">
                <TextoConRitmo key={escena.id} cues={escena.cues} />
              </div>
            )}
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
        editando={editando}
        vistaCamara={escena && !voz ? pref.vistaCamara : null}
        alReintentar={reintentar}
        alEnsayar={() => void arrancar(false)}
        alGrabar={() => void arrancar(true)}
        alParar={() => void parar()}
        alRepetir={() => void repetir()}
        alEditar={editar}
        alCambiarVista={cambiarVista}
        alEventoToma={alEventoToma}
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
