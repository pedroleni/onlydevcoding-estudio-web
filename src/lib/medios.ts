const API_LOCAL = "http://127.0.0.1:8000";

function sinBarraFinal(url: string): string {
  return url.replace(/\/+$/, "");
}

export function urlApiPublica(): string {
  return sinBarraFinal(process.env.NEXT_PUBLIC_API_URL ?? API_LOCAL);
}

export function urlMedio(ruta: string): string {
  return `${urlApiPublica()}/api/medios?ruta=${encodeURIComponent(ruta)}`;
}

// La URL de un medio con su versión (para que el navegador no sirva una copia vieja), codificada.
export function urlToma(ruta: string, version: number | string | null): string {
  const base = urlMedio(ruta);
  return version === null ? base : `${base}&v=${encodeURIComponent(String(version))}`;
}
