"use server";

import { refresh } from "next/cache";

import { escribir } from "@/lib/api-escritura";
import { CURSO_VALIDO } from "@/lib/curso";
import { detalleDe } from "@/lib/detalle-api";
import { origenPermitido } from "@/lib/origen-servidor";
import type { ReelsCurso } from "@/lib/tipos";

const GANCHO_VALIDO = /^[A-Za-z0-9_-]{1,20}$/;

export type ResultadoGrabado =
  | { ok: true; reels: ReelsCurso }
  | { ok: false; mensaje: string };

export async function marcarGanchoGrabado(
  curso: string,
  numero: number,
  gancho: string,
  grabado: boolean,
): Promise<ResultadoGrabado> {
  if (
    typeof curso !== "string" ||
    !CURSO_VALIDO.test(curso) ||
    typeof numero !== "number" ||
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 999 ||
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
      mensaje:
        typeof detalle === "string"
          ? detalle
          : respuesta.status === 401
            ? "La API ha rechazado el token de escritura"
            : "No se pudo guardar el gancho",
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
