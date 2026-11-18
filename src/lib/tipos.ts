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

export interface EnlaceVista {
  curso_nombre: string | null;
  leccion_titulo: string | null;
  pieza_titulo: string | null;
  roto: boolean;
}

export interface TareaNueva {
  fecha: string;
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

export type IdAccion =
  | "alinear-voz"
  | "preparar-montaje"
  | "previa-grabacion"
  | "render-leccion"
  | "video-final"
  | "preparar-shorts"
  | "render-short";

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
