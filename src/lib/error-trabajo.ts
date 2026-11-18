// `Trabajo.error` solo trae mensajes fijos de la API. Aun así, si algún día llega algo con
// aspecto de ruta del disco, no se enseña: la app sale en capturas y vídeos.
export function textoErrorTrabajo(error: string | null): string | null {
  const texto = error?.trim();
  if (!texto || /[/\\]/.test(texto)) return null;
  return texto;
}

// El trabajo ya no está en la API (por ejemplo, tras restaurar la base): no tiene sentido
// seguir preguntando por él. Vive aquí y no en `trabajos.ts` para que los tests que simulan
// la lectura puedan seguir usando la clase real.
export class TrabajoInexistente extends Error {
  constructor() {
    super("El trabajo ya no existe");
    this.name = "TrabajoInexistente";
  }
}
