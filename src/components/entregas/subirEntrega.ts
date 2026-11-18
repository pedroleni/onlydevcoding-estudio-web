import {
  esNombreEntrega,
  MENSAJE_NO_ES_VIDEO,
  MENSAJE_NOMBRE_NO_ADMITIDO,
  MENSAJE_TAMANO_ENTREGA,
  TAMANO_MAXIMO_ENTREGA,
  tipoEntrega,
} from "@/lib/entregas";

export type ResultadoSubida =
  | { ok: true; archivo: string; bytes: number }
  | { ok: false; cancelada: boolean; mensaje: string };

const CANCELADA: ResultadoSubida = { ok: false, cancelada: true, mensaje: "Subida cancelada" };

function fallo(mensaje: string): ResultadoSubida {
  return { ok: false, cancelada: false, mensaje };
}

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function detalle(datos: unknown): string | null {
  if (typeof datos !== "object" || datos === null || !("detail" in datos)) return null;
  const valor = (datos as { detail: unknown }).detail;
  return typeof valor === "string" && valor ? valor : null;
}

// Sube una toma de cámara al proxy `/entregar/…` con `XMLHttpRequest`, que (a diferencia de
// `fetch`) informa del avance de la subida. Nunca rechaza: los errores de la API, los cortes y las
// cancelaciones vuelven como `{ ok: false }` para que la cola siga con los demás archivos.
export function subirEntrega(
  curso: string,
  numero: number,
  archivo: File,
  alAvanzar: (fraccion: number) => void,
  senal: AbortSignal,
): Promise<ResultadoSubida> {
  // Lo que la API va a rechazar no se sube: serían hasta 4 GiB para nada.
  const tipo = tipoEntrega(archivo.name);
  if (!esNombreEntrega(archivo.name) || tipo === null) {
    return Promise.resolve(fallo(MENSAJE_NOMBRE_NO_ADMITIDO));
  }
  if (archivo.size > TAMANO_MAXIMO_ENTREGA) {
    return Promise.resolve(fallo(MENSAJE_TAMANO_ENTREGA));
  }
  if (archivo.size === 0) return Promise.resolve(fallo(MENSAJE_NO_ES_VIDEO));
  if (senal.aborted) return Promise.resolve(CANCELADA);

  return new Promise((resolver) => {
    const xhr = new XMLHttpRequest();
    let terminado = false;
    const terminar = (resultado: ResultadoSubida) => {
      if (terminado) return;
      terminado = true;
      senal.removeEventListener("abort", cancelar);
      resolver(resultado);
    };
    const cancelar = () => {
      xhr.abort();
      terminar(CANCELADA);
    };

    xhr.open(
      "PUT",
      `/entregar/${encodeURIComponent(curso)}/${numero}/${encodeURIComponent(archivo.name)}`,
    );
    xhr.setRequestHeader("Content-Type", tipo);
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) {
        alAvanzar(Math.min(1, evento.loaded / evento.total));
      }
    };
    xhr.onload = () => {
      const datos = leerJson(xhr.responseText);
      if (xhr.status === 201) {
        const entrega = datos as { archivo?: unknown; bytes?: unknown } | null;
        terminar({
          ok: true,
          archivo: typeof entrega?.archivo === "string" ? entrega.archivo : archivo.name,
          bytes: typeof entrega?.bytes === "number" ? entrega.bytes : archivo.size,
        });
        return;
      }
      terminar(
        fallo(detalle(datos) ?? `No se ha podido subir la toma (error ${xhr.status})`),
      );
    };
    xhr.onerror = () => terminar(fallo("La subida se ha cortado"));
    xhr.onabort = () => terminar(CANCELADA);
    senal.addEventListener("abort", cancelar);
    xhr.send(archivo);
  });
}
