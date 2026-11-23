// El texto de un error cualquiera, para enseñarlo en la interfaz.
export function mensajeError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}
