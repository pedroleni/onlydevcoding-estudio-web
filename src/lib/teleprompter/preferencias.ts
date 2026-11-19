import { useSyncExternalStore } from "react";

import { CURSO_VALIDO } from "@/lib/curso";

export const CLAVE_PREFERENCIAS = "teleprompter-preferencias";

export const TAMANOS_PREVIA = [0, 320, 440, 600] as const;

type LeccionPreferida = { curso: string; numero: number };

export type Preferencias = {
  ritmo: number;
  letra: number;
  leccion: LeccionPreferida | null;
  micro: string;
  vistaCamara: "guion" | "puntos";
  tamPrevia: (typeof TAMANOS_PREVIA)[number];
};

export const PREFERENCIAS_POR_DEFECTO: Preferencias = Object.freeze({
  ritmo: 150,
  letra: 52,
  leccion: null,
  micro: "",
  vistaCamara: "guion",
  tamPrevia: 440,
}) as Preferencias;

export const RITMO = { min: 110, max: 200, paso: 5 } as const;
export const LETRA = { min: 32, max: 80, paso: 2 } as const;

function enEscala(
  valor: unknown,
  { min, max, paso }: { min: number; max: number; paso: number },
  porDefecto: number,
): number {
  if (typeof valor !== "number" || !Number.isFinite(valor) || valor < min || valor > max) {
    return porDefecto;
  }
  return min + Math.round((valor - min) / paso) * paso;
}

function leccionValida(valor: unknown): LeccionPreferida | null {
  if (typeof valor !== "object" || valor === null) return null;
  const { curso, numero } = valor as Record<string, unknown>;
  if (
    typeof curso !== "string" ||
    !CURSO_VALIDO.test(curso) ||
    typeof numero !== "number" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 999
  ) {
    return null;
  }
  return { curso, numero };
}

export function normalizarPreferencias(valor: unknown): Preferencias {
  if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
    return PREFERENCIAS_POR_DEFECTO;
  }
  const datos = valor as Record<string, unknown>;
  const tamPrevia = TAMANOS_PREVIA.find((tam) => tam === datos.tamPrevia);

  return {
    ritmo: enEscala(datos.ritmo, RITMO, PREFERENCIAS_POR_DEFECTO.ritmo),
    letra: enEscala(datos.letra, LETRA, PREFERENCIAS_POR_DEFECTO.letra),
    leccion: leccionValida(datos.leccion),
    micro:
      typeof datos.micro === "string" && datos.micro.length <= 512 ? datos.micro : "",
    vistaCamara: datos.vistaCamara === "puntos" ? "puntos" : "guion",
    tamPrevia: tamPrevia ?? PREFERENCIAS_POR_DEFECTO.tamPrevia,
  };
}

// localStorage puede no existir o lanzar al acceder (navegación privada, datos bloqueados):
// entonces las preferencias viven solo en memoria mientras la página esté abierta.
// Si se puede leer pero no escribir (cuota llena), se deja de leer de él para no perder cambios.
let enMemoria: string | null = null;
let soloMemoria = false;
let ultimoTexto: string | null | undefined;
let ultimas: Preferencias = PREFERENCIAS_POR_DEFECTO;
const suscriptores = new Set<() => void>();

function almacen(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function leerTexto(): string | null {
  if (soloMemoria) return enMemoria;
  try {
    const origen = almacen();
    return origen ? origen.getItem(CLAVE_PREFERENCIAS) : enMemoria;
  } catch {
    return enMemoria;
  }
}

export function leerPreferencias(): Preferencias {
  const texto = leerTexto();
  if (texto === ultimoTexto) return ultimas;

  let valor: unknown = null;
  try {
    valor = texto === null ? null : JSON.parse(texto);
  } catch {
    valor = null;
  }
  ultimoTexto = texto;
  ultimas = normalizarPreferencias(valor);
  return ultimas;
}

export function guardarPreferencias(cambio: Partial<Preferencias>): Preferencias {
  const nuevas = normalizarPreferencias({ ...leerPreferencias(), ...cambio });
  const texto = JSON.stringify(nuevas);
  enMemoria = texto;
  const destino = soloMemoria ? null : almacen();
  if (destino) {
    try {
      destino.setItem(CLAVE_PREFERENCIAS, texto);
    } catch {
      soloMemoria = true;
    }
  }
  for (const aviso of suscriptores) aviso();
  return leerPreferencias();
}

export function suscribirPreferencias(aviso: () => void): () => void {
  suscriptores.add(aviso);
  return () => {
    suscriptores.delete(aviso);
  };
}

const enServidor = () => PREFERENCIAS_POR_DEFECTO;

// En el servidor y durante la hidratación se usan los valores por defecto; después, los guardados.
export function usePreferencias(): Preferencias {
  return useSyncExternalStore(suscribirPreferencias, leerPreferencias, enServidor);
}
