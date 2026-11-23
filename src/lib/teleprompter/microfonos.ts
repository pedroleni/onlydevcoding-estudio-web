import { mensajeError } from "@/lib/mensaje-error";

export type Microfono = { id: string; nombre: string };

export const MENSAJE_ABRIENDO_MICRO =
  "Abriendo el micrófono… acepta el permiso si el navegador te lo pide.";

const AYUDA_PERMISO_MICRO =
  " Revisa el permiso del micrófono de esta página en Chrome y, en el Mac, Ajustes del Sistema → Privacidad y seguridad → Micrófono → Google Chrome.";

export function mensajeFalloMicro(error: unknown): string {
  const denegado = error instanceof DOMException && error.name === "NotAllowedError";
  const ayuda = denegado ? AYUDA_PERMISO_MICRO : "";
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
