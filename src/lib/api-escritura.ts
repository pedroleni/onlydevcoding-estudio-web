import "server-only";

const API_LOCAL = "http://127.0.0.1:8000";
const MENSAJE_TOKEN_AUSENTE = "Falta ESTUDIO_TOKEN en el .env de la web";

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function escribir(ruta: string, cuerpo: unknown): Promise<Response> {
  const token = process.env.ESTUDIO_TOKEN;

  if (!token) {
    return Response.json(
      { detail: MENSAJE_TOKEN_AUSENTE },
      { status: 503 },
    );
  }

  const api = sinBarraFinal(process.env.API_URL ?? API_LOCAL);
  return fetch(`${api}${ruta}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Estudio-Token": token,
    },
    body: JSON.stringify(cuerpo),
    cache: "no-store",
  });
}
