import { type NextRequest, NextResponse } from "next/server";

import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

function escaparHtml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function proxy(request: NextRequest): NextResponse {
  const host = request.headers.get("host");

  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.headers.get("origin") !== ORIGEN_ESTUDIO
  ) {
    return new NextResponse("Origin no permitido", {
      status: 403,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (host === HOST_ESTUDIO) {
    return NextResponse.next();
  }

  if (host === "localhost:3000") {
    // Página que salta sola, no una redirección con Location: Next vuelve
    // relativa la Location cuando cree que el host es el mismo (lo deduce de la
    // cabecera Host) y el navegador acabaría otra vez en localhost.
    const { pathname, search } = request.nextUrl;
    const destino = escaparHtml(
      new URL(`${pathname}${search}`, ORIGEN_ESTUDIO).href,
    );
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destino}"><title>Estudio OnlyDevCoding</title></head><body><p>El estudio se abre en <a href="${destino}">${destino}</a>.</p></body></html>`;
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  return new NextResponse("Host no permitido", {
    status: 400,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

export const config = {
  matcher: ["/((?!_next(?:/|$)|grabar(?:/|$)).*)"],
};
