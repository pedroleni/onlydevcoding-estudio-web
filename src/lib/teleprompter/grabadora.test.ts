import { afterEach, describe, expect, it, vi } from "vitest";

import { abrirMicro, aWav, grabar, subirToma } from "@/lib/teleprompter/grabadora";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("grabadora", () => {
  it("abre el micrófono elegido sin procesado y en mono", async () => {
    const getUserMedia = vi.fn().mockResolvedValue("flujo");
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia },
    });

    await expect(abrirMicro("micro-uno")).resolves.toBe("flujo");
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        deviceId: { exact: "micro-uno" },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
  });

  it("graba con el primer tipo admitido y devuelve lo grabado al parar", async () => {
    const creadas: Array<{ opciones: unknown; intervalo?: number }> = [];
    class Falsa {
      static isTypeSupported = (tipo: string) => tipo === "audio/webm";
      state = "inactive";
      mimeType: string;
      ondataavailable: ((evento: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      private registro: { opciones: unknown; intervalo?: number };
      constructor(_flujo: unknown, opciones?: { mimeType?: string }) {
        this.mimeType = opciones?.mimeType ?? "";
        this.registro = { opciones };
        creadas.push(this.registro);
      }
      start(intervalo: number) {
        this.state = "recording";
        this.registro.intervalo = intervalo;
        this.ondataavailable?.({ data: new Blob([]) });
        this.ondataavailable?.({ data: new Blob(["a"]) });
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({ data: new Blob(["b"]) });
        this.onstop?.();
      }
    }
    vi.stubGlobal("MediaRecorder", Falsa);

    const grabacion = grabar({} as MediaStream);
    const blob = await grabacion.parar();

    expect(creadas).toEqual([
      { opciones: { mimeType: "audio/webm", audioBitsPerSecond: 256000 }, intervalo: 250 },
    ]);
    expect(blob.type).toBe("audio/webm");
    expect(blob.size).toBe(2);
  });

  it("convierte lo grabado a WAV", async () => {
    const contexto = {
      decodeAudioData: vi.fn().mockResolvedValue({
        numberOfChannels: 1,
        length: 2,
        sampleRate: 8000,
        getChannelData: () => new Float32Array([0, 1]),
      }),
    } as unknown as BaseAudioContext;

    const wav = await aWav(new Blob(["x"]), contexto);
    const bytes = new Uint8Array(await wav.arrayBuffer());

    expect(wav.type).toBe("audio/wav");
    expect(wav.size).toBe(48);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
  });

  it("sube la toma con PUT y Content-Type audio/wav", async () => {
    const toma = { escena: "E03", ruta: "grabaciones/E03.wav", version: 2, bytes: 44 };
    const fetchFalso = vi.fn().mockResolvedValue(Response.json(toma, { status: 201 }));
    vi.stubGlobal("fetch", fetchFalso);
    const wav = new Blob(["RIFF"], { type: "audio/wav" });

    await expect(subirToma("curso-ficticio", 4, "E03", wav)).resolves.toEqual(toma);
    expect(fetchFalso).toHaveBeenCalledWith("/grabar/curso-ficticio/4/E03", {
      method: "PUT",
      body: wav,
      headers: { "Content-Type": "audio/wav" },
      signal: expect.any(AbortSignal),
    });
  });

  it("lanza con el detail de la respuesta si falla", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ detail: "La escena no es de voz" }, { status: 409 })),
    );

    await expect(
      subirToma("curso-ficticio", 4, "E03", new Blob([], { type: "audio/wav" })),
    ).rejects.toThrow("La escena no es de voz");
  });

  it("lanza con el estado si la respuesta no trae un detail legible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));

    await expect(
      subirToma("curso-ficticio", 4, "E03", new Blob([], { type: "audio/wav" })),
    ).rejects.toThrow("Error 502");
  });

  describe("tiempo máximo de la subida", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    // Un fetch que no responde nunca, pero que se corta al abortar su señal.
    function fetchColgado() {
      return vi.fn(
        (_url: string, opciones: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            opciones.signal?.addEventListener("abort", () =>
              reject(new DOMException("Abortado", "AbortError")),
            );
          }),
      );
    }

    it("a los 120 s corta la subida y lanza un error que lo dice", async () => {
      vi.useFakeTimers();
      const fetchFalso = fetchColgado();
      vi.stubGlobal("fetch", fetchFalso);

      const subida = subirToma("curso-ficticio", 4, "E03", new Blob([], { type: "audio/wav" }));
      const resultado = subida.catch((error: unknown) => error);

      await vi.advanceTimersByTimeAsync(119_999);
      expect(fetchFalso.mock.calls[0][1].signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      expect(fetchFalso.mock.calls[0][1].signal?.aborted).toBe(true);
      const error = await resultado;
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe(
        "La subida ha tardado más de 2 minutos y se ha cortado",
      );
    });

    it("si responde a tiempo no deja el temporizador puesto", async () => {
      vi.useFakeTimers();
      const toma = { escena: "E03", ruta: "grabaciones/E03.wav", version: 2, bytes: 44 };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(toma, { status: 201 })));

      await expect(
        subirToma("curso-ficticio", 4, "E03", new Blob([], { type: "audio/wav" })),
      ).resolves.toEqual(toma);
      expect(vi.getTimerCount()).toBe(0);
    });

    it("un error de red que no es el tiempo máximo se lanza tal cual", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

      await expect(
        subirToma("curso-ficticio", 4, "E03", new Blob([], { type: "audio/wav" })),
      ).rejects.toThrow("Failed to fetch");
    });
  });
});
