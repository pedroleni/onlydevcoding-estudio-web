import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { subirEntrega } from "@/components/entregas/subirEntrega";

class XhrFalso {
  static instancias: XhrFalso[] = [];

  metodo = "";
  url = "";
  cabeceras: Record<string, string> = {};
  cuerpo: unknown = null;
  status = 0;
  responseText = "";
  abortada = false;
  upload: { onprogress: ((evento: ProgressEvent) => void) | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    XhrFalso.instancias.push(this);
  }

  open(metodo: string, url: string) {
    this.metodo = metodo;
    this.url = url;
  }

  setRequestHeader(nombre: string, valor: string) {
    this.cabeceras[nombre] = valor;
  }

  send(cuerpo: unknown) {
    this.cuerpo = cuerpo;
  }

  abort() {
    this.abortada = true;
    this.onabort?.();
  }

  progreso(cargado: number, total: number) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: cargado, total } as ProgressEvent);
  }

  responder(status: number, cuerpo: unknown) {
    this.status = status;
    this.responseText = typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo);
    this.onload?.();
  }
}

function archivo(nombre: string, tipo = "video/quicktime", contenido = "ftypqt"): File {
  return new File([contenido], nombre, { type: tipo });
}

describe("subirEntrega", () => {
  beforeEach(() => {
    XhrFalso.instancias = [];
    vi.stubGlobal("XMLHttpRequest", XhrFalso);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sube con PUT al proxy, codifica el nombre con espacios e informa del progreso", async () => {
    const alAvanzar = vi.fn();
    const toma = archivo("Toma ficticia (2).MOV");

    const promesa = subirEntrega("react", 4, toma, alAvanzar, new AbortController().signal);
    const xhr = XhrFalso.instancias[0];
    xhr.progreso(3, 6);
    xhr.progreso(6, 6);
    xhr.responder(201, { archivo: "Toma ficticia (2).MOV", bytes: 6 });

    await expect(promesa).resolves.toEqual({
      ok: true,
      archivo: "Toma ficticia (2).MOV",
      bytes: 6,
    });
    expect(xhr.metodo).toBe("PUT");
    expect(xhr.url).toBe("/entregar/react/4/Toma%20ficticia%20(2).MOV");
    expect(xhr.cabeceras["Content-Type"]).toBe("video/quicktime");
    expect(xhr.cuerpo).toBe(toma);
    expect(alAvanzar).toHaveBeenNthCalledWith(1, 0.5);
    expect(alAvanzar).toHaveBeenLastCalledWith(1);
  });

  it("deduce el tipo por la extensión si el navegador no lo da", async () => {
    const promesa = subirEntrega(
      "react",
      4,
      archivo("toma.mp4", ""),
      vi.fn(),
      new AbortController().signal,
    );
    const xhr = XhrFalso.instancias[0];
    xhr.responder(201, { archivo: "toma.mp4", bytes: 6 });

    await promesa;
    expect(xhr.cabeceras["Content-Type"]).toBe("video/mp4");
  });

  it("resuelve con el error de la API en un 409", async () => {
    const promesa = subirEntrega(
      "react",
      4,
      archivo("toma.mov"),
      vi.fn(),
      new AbortController().signal,
    );
    XhrFalso.instancias[0].responder(409, { detail: "Ya hay una toma con ese nombre" });

    await expect(promesa).resolves.toEqual({
      ok: false,
      cancelada: false,
      mensaje: "Ya hay una toma con ese nombre",
    });
  });

  it("da un mensaje fijo si el error no trae detail", async () => {
    const promesa = subirEntrega(
      "react",
      4,
      archivo("toma.mov"),
      vi.fn(),
      new AbortController().signal,
    );
    XhrFalso.instancias[0].responder(500, "<html>fallo</html>");

    await expect(promesa).resolves.toEqual({
      ok: false,
      cancelada: false,
      mensaje: "No se ha podido subir la toma (error 500)",
    });
  });

  it("da un mensaje fijo si se corta la conexión", async () => {
    const promesa = subirEntrega(
      "react",
      4,
      archivo("toma.mov"),
      vi.fn(),
      new AbortController().signal,
    );
    XhrFalso.instancias[0].onerror?.();

    await expect(promesa).resolves.toEqual({
      ok: false,
      cancelada: false,
      mensaje: "La subida se ha cortado",
    });
  });

  it("cancela la subida con la señal", async () => {
    const control = new AbortController();
    const promesa = subirEntrega("react", 4, archivo("toma.mov"), vi.fn(), control.signal);
    const xhr = XhrFalso.instancias[0];

    control.abort();

    await expect(promesa).resolves.toEqual({
      ok: false,
      cancelada: true,
      mensaje: "Subida cancelada",
    });
    expect(xhr.abortada).toBe(true);
  });

  it("no empieza si la señal ya está cancelada", async () => {
    const control = new AbortController();
    control.abort();

    await expect(
      subirEntrega("react", 4, archivo("toma.mov"), vi.fn(), control.signal),
    ).resolves.toMatchObject({ ok: false, cancelada: true });
    expect(XhrFalso.instancias).toHaveLength(0);
  });

  it.each(["Toma ñ.mov", "toma.avi", ".oculta.mov"])(
    "no sube un nombre que la API no admite: %s",
    async (nombre) => {
      await expect(
        subirEntrega("react", 4, archivo(nombre), vi.fn(), new AbortController().signal),
      ).resolves.toEqual({
        ok: false,
        cancelada: false,
        mensaje:
          "Ese nombre de archivo no se admite: renómbralo con letras sin acentos, números, espacios, guiones o puntos",
      });
      expect(XhrFalso.instancias).toHaveLength(0);
    },
  );

  it("no sube un archivo vacío ni uno de más de 4 GiB", async () => {
    const vacio = archivo("toma.mov", "video/quicktime", "");
    const enorme = archivo("grande.mov");
    Object.defineProperty(enorme, "size", { value: 4_294_967_297 });

    await expect(
      subirEntrega("react", 4, vacio, vi.fn(), new AbortController().signal),
    ).resolves.toMatchObject({ ok: false, mensaje: "El archivo no es un vídeo MOV o MP4" });
    await expect(
      subirEntrega("react", 4, enorme, vi.fn(), new AbortController().signal),
    ).resolves.toMatchObject({ ok: false, mensaje: "La toma supera el límite de 4 GiB" });
    expect(XhrFalso.instancias).toHaveLength(0);
  });
});
