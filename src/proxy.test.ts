import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";

import { config, proxy } from "@/proxy";

function crearPeticion(
  host: string,
  ruta = "/cursos/demo?filtro=pendiente",
  opciones?: { method?: string; origin?: string },
) {
  return new NextRequest(`http://${host}${ruta}`, {
    method: opciones?.method,
    headers: {
      host,
      ...(opciones?.origin === undefined ? {} : { origin: opciones.origin }),
    },
  });
}

describe("proxy", () => {
  it("deja pasar el host local canónico", () => {
    const respuesta = proxy(crearPeticion("127.0.0.1:3000"));

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });

  it("rechaza un POST sin Origin", async () => {
    const respuesta = proxy(
      crearPeticion("127.0.0.1:3000", "/cursos/demo", { method: "POST" }),
    );

    expect(respuesta.status).toBe(403);
    expect(await respuesta.text()).toBe("Origin no permitido");
  });

  it("rechaza un POST con un Origin ajeno", async () => {
    const respuesta = proxy(
      crearPeticion("127.0.0.1:3000", "/cursos/demo", {
        method: "POST",
        origin: "http://sitio.ejemplo",
      }),
    );

    expect(respuesta.status).toBe(403);
  });

  it("deja pasar un POST con el Origin canónico", () => {
    const respuesta = proxy(
      crearPeticion("127.0.0.1:3000", "/cursos/demo", {
        method: "POST",
        origin: "http://127.0.0.1:3000",
      }),
    );

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("x-middleware-next")).toBe("1");
  });

  // Sin cabecera Location: Next la vuelve relativa cuando cree que el host es
  // el mismo, y el navegador acabaría otra vez en localhost.
  it("manda localhost al host canónico con una página que salta sola", async () => {
    const respuesta = proxy(
      crearPeticion("localhost:3000", "/cursos/curso-demo?filtro=pendiente&b=1"),
    );
    const html = await respuesta.text();
    const destino =
      "http://127.0.0.1:3000/cursos/curso-demo?filtro=pendiente&amp;b=1";

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("location")).toBeNull();
    expect(respuesta.headers.get("content-type")).toContain("text/html");
    expect(html).toContain(`<meta http-equiv="refresh" content="0; url=${destino}">`);
    expect(html).toContain(`<a href="${destino}">`);
  });

  it("escapa el destino dentro del HTML", async () => {
    const html = await proxy(
      crearPeticion("localhost:3000", "/x?q=%22%3E%3Cscript%3E"),
    ).text();

    expect(html).not.toContain("<script>");
  });

  it("rechaza cualquier otro host con texto plano", async () => {
    const respuesta = proxy(crearPeticion("estudio.ejemplo:3000"));

    expect(respuesta.status).toBe(400);
    expect(respuesta.headers.get("content-type")).toContain("text/plain");
    expect(await respuesta.text()).toBe("Host no permitido");
  });

  it("no se ejecuta al subir tomas y sí en las demás rutas de la app", () => {
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "/grabar/react/4/E03",
    })).toBe(false);
    expect(unstable_doesMiddlewareMatch({ config, url: "/" })).toBe(true);
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "/teleprompter?curso=react&leccion=4",
    })).toBe(true);
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "/cursos/react/lecciones/4",
    })).toBe(true);
  });

  it("sigue excluyendo todas las rutas internas de _next", () => {
    expect(unstable_doesMiddlewareMatch({
      config,
      url: "/_next/static/chunks/app.js",
    })).toBe(false);
  });
});
