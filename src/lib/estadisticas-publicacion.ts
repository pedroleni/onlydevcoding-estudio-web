import { REDES } from "@/lib/curso";
import { PLAN_LECCION, type PiezaPrevista } from "@/lib/plan-publicacion";
import {
  redesDisponibles,
  tieneContenido,
  TITULO_VIDEO_LINKEDIN,
} from "@/lib/redes-publicacion";
import type {
  Avance,
  EstadoLeccion,
  PiezaVista,
  RedVista,
  VistaPublicacion,
} from "@/lib/tipos";

export interface PiezaContada {
  // Identifica la fila: el id de la pieza o «leccion-linkedin» para el vídeo de LinkedIn.
  clave: string;
  titulo: string;
  pieza: PiezaVista;
  // Redes en que se publica la pieza: las del plan y las que ya tienen contenido.
  redes: RedVista[];
  pendientes: RedVista[];
  subidas: RedVista[];
  // La pieza está en el plan pero aún no tiene vídeo ni textos.
  prevista: boolean;
}

export interface LeccionContada {
  numero: number;
  titulo: string;
  piezas: PiezaContada[];
  pendientes: number;
  subidas: number;
  total: number;
  // Alguna pieza ya tiene vídeo o textos de publicación.
  empezada: boolean;
}

// Una pieza entra en la cuenta si ya tiene vídeo o algo que publicar en alguna red.
// Las lecciones aún sin preparar traen una pieza vacía que no cuenta.
function cuentaPieza(pieza: PiezaVista): boolean {
  return pieza.video !== null || pieza.redes.some(tieneContenido);
}

function redPendiente(red: RedVista["red"]): RedVista {
  return { red, textos: null, estado: { estado: "pendiente", fecha: null, url: null } };
}

function piezaPrevista(plan: PiezaPrevista): PiezaVista {
  return {
    id: plan.id,
    tipo: plan.tipo,
    titulo: plan.titulo,
    video: null,
    duracion: null,
    fecha_propuesta: null,
    portadas: [],
    portada_elegida: null,
    redes: [],
  };
}

function contarPieza(
  pieza: PiezaVista,
  redes: RedVista[],
  prevista: boolean,
  clave = pieza.id,
  titulo = pieza.titulo,
): PiezaContada {
  return {
    clave,
    titulo,
    pieza,
    redes,
    prevista,
    pendientes: redes.filter(({ estado }) => estado.estado !== "publicado"),
    subidas: redes.filter(({ estado }) => estado.estado === "publicado"),
  };
}

// Cada lección cuenta las 17 publicaciones del plan (lección, reel de lanzamiento y
// 4 shorts), estén preparadas o no, más las piezas y redes de sobra que ya tengan
// contenido. Lo subido es lo publicado; lo programado sigue en «queda por subir».
export function contarLeccion(
  numero: number,
  titulo: string,
  vista: VistaPublicacion | null,
): LeccionContada {
  const reales = vista?.piezas ?? [];
  const idsPlan = new Set(PLAN_LECCION.map(({ id }) => id));
  const piezas: PiezaContada[] = PLAN_LECCION.map((plan): PiezaContada[] => {
    const real = reales.find(({ id }) => id === plan.id);
    const redes = plan.redes.map(
      (id) => real?.redes.find(({ red }) => red === id) ?? redPendiente(id),
    );
    const deSobra = (real?.redes ?? []).filter(
      (red) => tieneContenido(red) && !plan.redes.includes(red.red),
    );
    const pieza = real ?? piezaPrevista(plan);
    const prevista = !real || !cuentaPieza(real);
    const todas = [...redes, ...deSobra];
    if (pieza.tipo !== "leccion") return [contarPieza(pieza, todas, prevista)];
    // El vídeo para LinkedIn va en su propia fila.
    return [
      contarPieza(pieza, todas.filter(({ red }) => red !== "linkedin"), prevista),
      contarPieza(
        pieza,
        todas.filter(({ red }) => red === "linkedin"),
        prevista,
        `${pieza.id}-linkedin`,
        TITULO_VIDEO_LINKEDIN,
      ),
    ];
  }).flat();
  for (const real of reales) {
    if (!idsPlan.has(real.id) && cuentaPieza(real)) {
      piezas.push(contarPieza(real, redesDisponibles(real), false));
    }
  }
  const pendientes = piezas.reduce((suma, p) => suma + p.pendientes.length, 0);
  const subidas = piezas.reduce((suma, p) => suma + p.subidas.length, 0);
  return {
    numero,
    titulo,
    piezas,
    pendientes,
    subidas,
    total: pendientes + subidas,
    empezada: reales.some(cuentaPieza),
  };
}

export function totalesPublicacion(lecciones: LeccionContada[]) {
  const piezas = lecciones.flatMap((leccion) => leccion.piezas);
  return {
    quedan: lecciones.reduce((suma, l) => suma + l.pendientes, 0),
    subidas: lecciones.reduce((suma, l) => suma + l.subidas, 0),
    quedanPorRed: REDES.map(([red, nombre]) => ({
      red,
      nombre,
      quedan: piezas.filter((p) => p.pendientes.some((r) => r.red === red)).length,
    })),
  };
}

export interface LeccionParaAvance {
  numero: number;
  estado: EstadoLeccion;
  publicacion: { subidas: number; total: number };
}

export interface AvanceCurso {
  porcentaje: number;
  queda: number;
  terminadas: number;
  lecciones: number;
  pasos: { paso: string; porcentaje: number }[];
  porLeccion: { numero: number; porcentaje: number }[];
}

const PASOS = ["Voz", "Cámara", "Vídeo final", "Publicación"] as const;

// Hacia abajo: una lección solo marca 100 % cuando no le falta nada.
function enPorcentaje(fraccion: number): number {
  return Math.floor(fraccion * 100 + 1e-9);
}

function media(valores: number[]): number {
  return valores.length === 0 ? 0 : valores.reduce((a, b) => a + b, 0) / valores.length;
}

// Un paso de grabación sin escenas no tiene nada que hacer (si hay guion).
function fraccionGrabada(avance: Avance, guion: boolean): number {
  if (avance.total <= 0) return guion ? 1 : 0;
  return Math.min(1, avance.hechas / avance.total);
}

// Cada lección vale lo mismo y tiene cuatro pasos del mismo peso: voz, cámara,
// vídeo final y publicación. Sin textos de publicación, ese paso cuenta 0.
export function avanceCurso(lecciones: LeccionParaAvance[]): AvanceCurso {
  const pasosPorLeccion = lecciones.map(({ estado, publicacion }) => [
    fraccionGrabada(estado.voz, estado.guion),
    fraccionGrabada(estado.camara, estado.guion),
    estado.video_final ? 1 : 0,
    publicacion.total > 0 ? Math.min(1, publicacion.subidas / publicacion.total) : 0,
  ]);
  const fraccionCurso = media(pasosPorLeccion.map(media));
  const porcentaje = enPorcentaje(fraccionCurso);
  return {
    porcentaje,
    queda: 100 - porcentaje,
    terminadas: pasosPorLeccion.filter((pasos) => pasos.every((p) => p >= 1)).length,
    lecciones: lecciones.length,
    pasos: PASOS.map((paso, i) => ({
      paso,
      porcentaje: enPorcentaje(media(pasosPorLeccion.map((pasos) => pasos[i]))),
    })),
    porLeccion: lecciones.map(({ numero }, i) => ({
      numero,
      porcentaje: enPorcentaje(media(pasosPorLeccion[i])),
    })),
  };
}

export function plural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// [7, 8, 9, 10] → «7–10»; [3, 7, 8, 9] → «3 y 7–9». Los tramos de dos van sueltos.
export function rangoNumeros(numeros: number[]): string {
  const ordenados = [...new Set(numeros)].sort((a, b) => a - b);
  const partes: string[] = [];
  let inicio = 0;
  while (inicio < ordenados.length) {
    let fin = inicio;
    while (fin + 1 < ordenados.length && ordenados[fin + 1] === ordenados[fin] + 1) fin++;
    if (fin - inicio >= 2) {
      partes.push(`${ordenados[inicio]}–${ordenados[fin]}`);
    } else {
      for (let i = inicio; i <= fin; i++) partes.push(String(ordenados[i]));
    }
    inicio = fin + 1;
  }
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} y ${partes.at(-1)}`;
}
