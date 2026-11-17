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
