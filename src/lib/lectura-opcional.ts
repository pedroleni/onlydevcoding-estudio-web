import { ApiNoDisponible, ErrorApi } from "@/lib/api";

// Para lecturas que acompañan a la página pero no la sostienen: si la API no responde o rechaza
// la petición, la página se pinta sin ellas. Cualquier otro error sigue su camino.
export async function lecturaApiOpcional<T>(lectura: Promise<T>): Promise<T | null> {
  try {
    return await lectura;
  } catch (error) {
    if (error instanceof ApiNoDisponible || error instanceof ErrorApi) {
      return null;
    }
    throw error;
  }
}
