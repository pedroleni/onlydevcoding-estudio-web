export type Microfono = { id: string; nombre: string };

export const MENSAJE_ABRIENDO_MICRO =
  "Abriendo el micrófono… acepta el permiso si el navegador te lo pide.";

const AYUDA_PERMISO_MICRO =
  " Revisa el permiso del micrófono de esta página en Chrome y, en el Mac, Ajustes del Sistema → Privacidad y seguridad → Micrófono → Google Chrome.";

export function mensajeError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string") return message;
  }
  return String(error);
}

export function mensajeFalloMicro(error: unknown): string {
  const nombre =
    typeof error === "object" && error !== null && "name" in error
      ? (error as { name: unknown }).name
      : "";
  const ayuda = nombre === "NotAllowedError" ? AYUDA_PERMISO_MICRO : "";
  return `No se puede usar el micrófono: ${mensajeError(error)}${ayuda}`;
}

export function esMicroDelPortatil(nombre: string): boolean {
  return /macbook|built-in|integrado|interno/i.test(nombre);
}

export function separarMicros(dispositivos: MediaDeviceInfo[]): {
  micros: Microfono[];
  nombrePredeterminado: string;
} {
  let nombrePredeterminado = "";
  const micros: Microfono[] = [];

  for (const { kind, deviceId, label } of dispositivos) {
    if (kind !== "audioinput" || deviceId === "") continue;
    if (deviceId === "default") {
      nombrePredeterminado = label;
      continue;
    }
    micros.push({ id: deviceId, nombre: label || "Micrófono" });
  }

  return { micros, nombrePredeterminado };
}
