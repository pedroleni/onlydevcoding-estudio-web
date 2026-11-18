import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiNoDisponible, ErrorApi } from "@/lib/api";
import { obtenerCamara } from "@/lib/camara";

function fetchCon(respuesta: Response) {
  const falso = vi.fn().mockResolvedValue(respuesta);
  vi.stubGlobal("fetch", falso);
  return falso;
}

describe("obtenerCamara", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lee /camara de la lección sin caché", async () => {
    const datos = { escenas: [], ganchos: [] };
    const falso = fetchCon(Response.json(datos));

    await expect(obtenerCamara("curso-ficticio", 4)).resolves.toEqual(datos);
    expect(falso).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/cursos/curso-ficticio/lecciones/4/camara",
      { cache: "no-store" },
    );
  });

  it("codifica el curso", async () => {
    const falso = fetchCon(Response.json({ escenas: [], ganchos: [] }));

    await obtenerCamara("a b", 4);

    expect(falso.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/cursos/a%20b/lecciones/4/camara");
  });

  it("devuelve null si la lección no existe o el número no es válido", async () => {
    const falso = fetchCon(new Response(null, { status: 404 }));

    await expect(obtenerCamara("curso-ficticio", 4)).resolves.toBeNull();
    await expect(obtenerCamara("curso-ficticio", 0)).resolves.toBeNull();
    await expect(obtenerCamara("curso-ficticio", 1.5)).resolves.toBeNull();
    expect(falso).toHaveBeenCalledOnce();
  });

  it("lanza los errores de la API para que la página los trate", async () => {
    fetchCon(new Response(null, { status: 503 }));
    await expect(obtenerCamara("curso-ficticio", 4)).rejects.toBeInstanceOf(ApiNoDisponible);

    fetchCon(new Response(null, { status: 422 }));
    await expect(obtenerCamara("curso-ficticio", 4)).rejects.toBeInstanceOf(ErrorApi);
  });
});
