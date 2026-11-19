"use server";

import { refresh } from "next/cache";

import { escribir } from "@/lib/api-escritura";
import { leccionValida } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { origenPermitido } from "@/lib/origen-servidor";
import type { ReelsCurso } from "@/lib/tipos";

const GANCHO_VALIDO = /^[A-Za-z0-9_-]{1,20}$/;

export type ResultadoGrabado =
  | { ok: true; reels: ReelsCurso }
  | { ok: false; mensaje: string };

function mensajeDeRespuesta(estado: number, detalle: unknown): string {
  if (typeof detalle === "string") return detalle;
  if (estado === 401) return "La API ha rechazado el token de escritura";
  return "No se pudo guardar el gancho";
}

export async function marcarGanchoGrabado(
  curso: string,
  numero: number,
  gancho: string,
  grabado: boolean,
): Promise<ResultadoGrabado> {
  if (
    !leccionValida(curso, numero) ||
    typeof gancho !== "string" ||
    !GANCHO_VALIDO.test(gancho) ||
    typeof grabado !== "boolean"
  ) {
    return { ok: false, mensaje: "El gancho no es válido" };
  }
  if (!(await origenPermitido())) return { ok: false, mensaje: "Origen no permitido" };

  let escritura;
  try {
    escritura = await escribir(
      `/api/cursos/${encodeURIComponent(curso)}/lecciones/${numero}/ganchos/${encodeURIComponent(gancho)}/grabado`,
      { grabado },
      "PUT",
    );
  } catch (causa) {
    console.error("Error inesperado al marcar un gancho como grabado", {
      tipo: causa instanceof Error ? causa.name : typeof causa,
    });
    return { ok: false, mensaje: "No se puede conectar con la API" };
  }
  if (!escritura.ok) return escritura;

  const { respuesta } = escritura;
  if (!respuesta.ok) {
    const detalle =
      respuesta.status === 404 ? await detalleDe(respuesta, { textoBruto: false }) : undefined;
    return {
      ok: false,
      mensaje: mensajeDeRespuesta(respuesta.status, detalle),
    };
  }
  try {
    const reels = (await respuesta.json()) as ReelsCurso;
    refresh();
    return { ok: true, reels };
  } catch {
    return { ok: false, mensaje: "La API ha devuelto una respuesta no válida" };
  }
}
