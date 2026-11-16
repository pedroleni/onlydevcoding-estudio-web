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
}

export interface Curso {
  id: string;
  nombre: string;
  carpeta: string;
  lecciones: number;
}
