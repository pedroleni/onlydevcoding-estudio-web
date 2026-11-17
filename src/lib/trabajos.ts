import type { Trabajo } from "@/lib/tipos";

const API_LOCAL = "http://127.0.0.1:8000";

function urlApiPublica(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? API_LOCAL).replace(/\/+$/, "");
}

export async function leerTrabajo(id: number): Promise<Trabajo> {
  const respuesta = await fetch(`${urlApiPublica()}/api/trabajos/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (respuesta.status !== 200) {
    throw new Error(`No se ha podido leer el trabajo (estado ${respuesta.status})`);
  }

  return (await respuesta.json()) as Trabajo;
}
