import type {
  AsignacionToma,
  Entregas,
  EstadoAccion,
  IdAccion,
  TomaPropuesta,
  Trabajo,
} from "@/lib/tipos";

type EstadoSubida = "esperando" | "subiendo" | "hecha" | "error" | "cancelada";

export interface Subida {
  clave: number;
  archivo: File;
  // Escena de cámara en la que estaba la zona al soltar el archivo.
  escena?: string;
  estado: EstadoSubida;
  fraccion: number;
  mensaje: string | null;
}

export interface SubidaAqui {
  archivo: string;
  escena?: string;
}

export function enCurso(subida: Subida): boolean {
  return subida.estado === "esperando" || subida.estado === "subiendo";
}

export function enMarcha(trabajo: Trabajo | null): boolean {
  return trabajo?.estado === "en_marcha";
}

export function trabajoEnMarcha(acciones: EstadoAccion[] | null | undefined, id: IdAccion) {
  const ultimo = acciones?.find((accion) => accion.id === id)?.ultimo ?? null;
  return enMarcha(ultimo) ? ultimo : null;
}

export function porcentaje(fraccion: number): number {
  return Math.round(Math.min(1, Math.max(0, fraccion)) * 100);
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

export function avisosDeSustitucion(entregas: Entregas, asignaciones: AsignacionToma[]): string[] {
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

export interface RevisionEntregas {
  // Tomas que la propuesta ha analizado, en su orden.
  tomas: TomaPropuesta[];
  // Archivos de entregas/ que la propuesta no recoge.
  sinAnalizar: Entregas["archivos"];
  valorDe: (archivo: string) => string;
  asignaciones: AsignacionToma[];
}

// Lo que se revisa: tomas analizadas y sin analizar, el destino elegido para cada una (lo que ha
// cambiado la persona o, si no, el inicial) y las asignaciones que se mandarían al colocar.
export function revisionTomas(
  entregas: Entregas | null,
  subidasAqui: readonly SubidaAqui[],
  seleccion: Record<string, string>,
): RevisionEntregas {
  const tomas = entregas?.propuesta?.archivos ?? [];
  const analizadas = new Set(tomas.map(({ archivo }) => archivo));
  const sinAnalizar = (entregas?.archivos ?? []).filter(({ archivo }) => !analizadas.has(archivo));
  const inicial = entregas ? seleccionInicial(entregas, subidasAqui) : {};
  const valorDe = (archivo: string) => seleccion[archivo] ?? inicial[archivo] ?? "";
  const asignaciones: AsignacionToma[] = tomas.map(({ archivo }) => ({
    archivo,
    destino: valorDe(archivo) || null,
  }));
  return { tomas, sinAnalizar, valorDe, asignaciones };
}

export function textoSinAnalizar(identificando: boolean, hayPropuesta: boolean): string {
  if (identificando) return "Pendiente de identificar";
  return hayPropuesta ? "No se ha podido analizar" : "Sin identificar";
}
