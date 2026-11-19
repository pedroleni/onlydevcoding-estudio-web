import type { IdAccion } from "@/lib/catalogo-acciones";

export type { IdAccion };

export interface Avance {
  hechas: number;
  total: number;
}

export interface EstadoLeccion {
  guion: boolean;
  voz: Avance;
  camara: Avance;
  video_final: boolean;
  miniatura: string | null;
  previa: string | null;
  publicado: Record<string, boolean>;
  // Piezas publicadas de las previstas en cada red (las APIs anteriores no lo envían).
  publicado_avance?: Record<string, Avance>;
  // «leccion» y «cortos» (reels y shorts): avance por red de cada grupo.
  publicado_por_grupo?: Record<string, Record<string, Avance>>;
}

export interface Escena {
  id: string;
  modo: "voz" | "camara" | "animacion";
  tipo: string;
  titulo: string;
  textos: string[];
  inicio_s: number | null;
  duracion_s: number | null;
}

export interface Pieza {
  id: string;
  tipo: "leccion" | "reel" | "short";
  titulo: string;
  video: string | null;
  portadas: string[];
}

export interface LeccionResumen {
  curso: string;
  numero: number;
  slug: string;
  titulo: string;
  estado: EstadoLeccion;
}

export interface Leccion extends LeccionResumen {
  subtitulo: string;
  escenas: Escena[];
  piezas: Pieza[];
  previas: string[];
  duracion_s: number | null;
  montaje: EstadoMontaje | null;
}

export interface Curso {
  id: string;
  nombre: string;
  carpeta: string | null;
  lecciones: number;
  en_disco: boolean;
}

export interface EnlaceTarea {
  curso: string;
  numero?: number | null;
  pieza?: string | null;
  red?: RedVista["red"] | null;
}

interface EnlaceVista {
  curso_nombre: string | null;
  leccion_titulo: string | null;
  pieza_titulo: string | null;
  roto: boolean;
}

export interface TareaNueva {
  // null: la tarea está en la lista total, sin día asignado.
  fecha: string | null;
  hora?: string | null;
  texto: string;
  tipo: string;
  enlace?: EnlaceTarea | null;
}

export interface TareaVista extends Omit<TareaNueva, "hora" | "enlace"> {
  id: number;
  hora: string | null;
  hecha: boolean;
  hecha_en: string | null;
  enlace: EnlaceTarea | null;
  enlace_vista: EnlaceVista | null;
}

export interface TipoTarea {
  id: string;
  nombre: string;
  color:
    | "#299BC6"
    | "#4BC98C"
    | "#E8A33D"
    | "#E5534B"
    | "#A371F7"
    | "#6CCBEF"
    | "#F778BA"
    | "#9B9BA4";
  orden: number;
}

export interface TareasDelRango {
  tareas: TareaVista[];
  atrasadas: TareaVista[];
}

export interface TextosRed {
  titulos: string[];
  descripcion: string | null;
  etiquetas: string[];
  texto: string | null;
  comentario_fijado: string | null;
  ajustes: string[];
  video: string | null;
  notas: string | null;
}

export type TextosEditables = Omit<TextosRed, "video">;

export interface EstadoRed {
  estado: "pendiente" | "programado" | "publicado";
  fecha: string | null;
  url: string | null;
}

export interface RedVista {
  red: "youtube" | "instagram" | "tiktok" | "linkedin";
  textos: TextosRed | null;
  estado: EstadoRed;
}

export interface PiezaVista {
  id: string;
  tipo: "leccion" | "reel" | "short";
  titulo: string;
  video: string | null;
  duracion: string | null;
  fecha_propuesta: string | null;
  portadas: string[];
  portada_elegida: string | null;
  redes: RedVista[];
}

export interface VistaPublicacion {
  curso: string;
  numero: number;
  piezas: PiezaVista[];
  despues_de_publicar: string[];
  notas: string | null;
  error: string | null;
  guia: string | null;
  aviso: string | null;
}

export interface Trabajo {
  id: number;
  accion: string;
  curso: string | null;
  numero: number | null;
  objetivo: string | null;
  estado: "en_marcha" | "hecho" | "error" | "interrumpido" | "cancelado";
  progreso: number;
  inicio: string;
  fin: string | null;
  error: string | null;
}


export interface EstadoAccion {
  id: IdAccion;
  etiqueta: string;
  disponible: boolean;
  motivo: string | null;
  opciones: string[];
  ultimo: Trabajo | null;
  ultimos: Record<string, Trabajo>;
}

export interface EstadoMontaje {
  estado: "sin_montaje" | "voz_sin_alinear" | "guion_cambiado" | "al_dia";
  sin_alinear: string[];
}

export interface EstadoPrevia {
  ruta: string | null;
  existe: boolean;
  desactualizada: boolean;
  version: number | null;
  trabajo: Trabajo | null;
}

export interface EscenaTeleprompter {
  id: string;
  modo: "voz" | "camara";
  titulo: string;
  cues: Array<{
    texto: string;
    pausa?: number;
  }>;
  puntos: string[];
  grabada: boolean;
  toma: string | null;
  version_toma: number | null;
}

export interface Montaje {
  fps: number;
  duracion: number;
  escenas: Array<{
    id: string;
    modo: "voz" | "camara" | "animacion";
    inicio: number;
    duracion: number;
    cues: number[];
  }>;
}

export interface Teleprompter {
  curso: string;
  numero: number;
  guion: string;
  titulo: string;
  version: string;
  ganchos: Array<{
    id: string;
    titulo: string;
    texto: string;
  }>;
  escenas: EscenaTeleprompter[];
  montaje: Montaje | null;
  previa: EstadoPrevia;
}

export interface TomaGuardada {
  escena: string;
  ruta: string;
  version: number;
  bytes: number;
}

// Tomas de cámara entregadas (`GET /api/cursos/{curso}/lecciones/{numero}/entregas`).
interface ArchivoEntregado {
  archivo: string;
  bytes: number;
}

interface DestinoPropuesta {
  tipo: "camara" | "gancho";
  id: string;
}

interface CandidatoPropuesta extends DestinoPropuesta {
  puntuacion: number;
  desde: number;
  hasta: number;
  cues?: number[] | null;
}

export interface TomaPropuesta {
  archivo: string;
  bytes: number;
  orientacion: "horizontal" | "vertical";
  duracion: number;
  texto: string;
  propuesta: DestinoPropuesta | null;
  repite: DestinoPropuesta | null;
  candidatos: CandidatoPropuesta[];
}

export interface PropuestaTomas {
  version: 1;
  guion: string;
  archivos: TomaPropuesta[];
}

interface DestinosEntrega {
  camara: Array<{ id: string; titulo: string; tiene_toma: boolean }>;
  ganchos: Array<{ id: string; titulo: string; entregado: boolean }>;
}

export interface Entregas {
  archivos: ArchivoEntregado[];
  propuesta: PropuestaTomas | null;
  destinos: DestinosEntrega;
}

// Destino de una toma al colocarla: `E17`, el id de un gancho, `"cierre"` o `null` (no usar).
export interface AsignacionToma {
  archivo: string;
  destino: string | null;
}

export interface ResultadoColocar {
  colocadas: Array<{ archivo: string; destino: string }>;
  ganchos: number;
}

// Tomas a cámara y de los ganchos ya colocadas (`GET /api/cursos/{curso}/lecciones/{numero}/camara`).
// `video` es una ruta pública de `/api/medios` y `version`, la que la acompaña en la URL.
export interface EscenaCamara {
  id: string;
  titulo: string;
  video: string | null;
  version: number | null;
  // Solo el nombre del archivo original, sin carpetas.
  original: string | null;
  mejorada: boolean;
}

export interface GanchoCamara {
  id: string;
  titulo: string;
  toma: string | null;
  video: string | null;
  version: number | null;
  color: boolean;
}

export interface TomasCamara {
  escenas: EscenaCamara[];
  ganchos: GanchoCamara[];
}

// Ganchos verticales por grabar (`GET /api/cursos/{curso}/reels`).
interface GanchoReel {
  id: string;
  titulo: string;
  texto: string;
  // Marcado a mano en el teleprompter o con la toma ya entregada.
  grabado: boolean;
  entregado: boolean;
}

interface LeccionReels {
  numero: number;
  titulo: string;
  ganchos: GanchoReel[];
}

export interface ReelsCurso {
  lecciones: LeccionReels[];
}

// Lecciones previstas del curso (`GET /api/cursos/{curso}/temario`).
export interface LeccionTemario {
  numero: number;
  titulo: string;
  modulo: string | null;
}

export interface Temario {
  lecciones: LeccionTemario[];
}
