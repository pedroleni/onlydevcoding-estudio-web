import "server-only";

const API_LOCAL = "http://127.0.0.1:8000";
const LIMITE_CUERPO_BYTES = 256 * 1024;

export const MENSAJE_TOKEN_AUSENTE = "Falta ESTUDIO_TOKEN en el .env de la web";

export type ResultadoEscritura =
  | { ok: true; respuesta: Response }
  | { ok: false; mensaje: string };

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

export function urlApi(): string {
  return sinBarraFinal(process.env.API_URL ?? API_LOCAL);
}

export async function escribir(
  ruta: string,
  cuerpo: unknown,
  metodo: "PUT" | "POST" | "DELETE" = "PUT",
): Promise<ResultadoEscritura> {
  const token = process.env.ESTUDIO_TOKEN;

  if (!token) {
    return { ok: false, mensaje: MENSAJE_TOKEN_AUSENTE };
  }

  const cuerpoJson = JSON.stringify(metodo === "DELETE" ? {} : cuerpo);
  if (new TextEncoder().encode(cuerpoJson).byteLength > LIMITE_CUERPO_BYTES) {
    return { ok: false, mensaje: "El cuerpo supera el límite de 256 KB" };
  }

  const respuesta = await fetch(`${urlApi()}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      "X-Estudio-Token": token,
    },
    body: cuerpoJson,
    cache: "no-store",
    redirect: "error",
  });
  return { ok: true, respuesta };
}
