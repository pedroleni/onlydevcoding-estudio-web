import type { LeccionContada } from "@/lib/estadisticas-publicacion";
import type { FichaLeccion } from "@/lib/lecciones-curso";
import type { Curso } from "@/lib/tipos";

export interface DatosCurso {
  curso: Curso;
  // Todas las lecciones del curso: las de disco y las que solo están en el temario.
  fichas: FichaLeccion[];
  contadas: LeccionContada[];
  sinLeer: number[];
  ganchos: { grabados: number; total: number };
}
