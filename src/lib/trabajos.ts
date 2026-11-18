import { TrabajoInexistente } from "@/lib/error-trabajo";
import type { Trabajo } from "@/lib/tipos";
import { urlApiPublica } from "@/lib/medios";

export { TrabajoInexistente };

export async function leerTrabajo(id: number): Promise<Trabajo> {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error("El id del trabajo no es válido");
  }

  const respuesta = await fetch(`${urlApiPublica()}/api/trabajos/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (respuesta.status === 404) throw new TrabajoInexistente();
  if (respuesta.status !== 200) {
    throw new Error(`No se ha podido leer el trabajo (estado ${respuesta.status})`);
  }

  return (await respuesta.json()) as Trabajo;
}
