import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Teleprompter } from "@/components/teleprompter/Teleprompter";
import { subirToma } from "@/lib/teleprompter/grabadora";
import { CLAVE_PREFERENCIAS } from "@/lib/teleprompter/preferencias";
import type { EscenaTeleprompter, Teleprompter as DatosTeleprompter } from "@/lib/tipos";

const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/teleprompter/grabadora", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/teleprompter/grabadora")>();
  return { ...original, subirToma: vi.fn() };
});

function escena(
  id: string,
  modo: EscenaTeleprompter["modo"] | "animacion",
  cambios: Partial<EscenaTeleprompter> = {},
): EscenaTeleprompter {
  return {
    id,
    modo: modo as EscenaTeleprompter["modo"],
    titulo: `Escena ficticia ${id}`,
    cues: [{ texto: "Una frase inventada para probar." }],
    puntos: ["Un punto inventado"],
    grabada: false,
    toma: null,
    version_toma: null,
    ...cambios,
  };
}

const datos: DatosTeleprompter = {
  curso: "curso-ficticio",
  numero: 4,
  guion: "curso-ficticio-04",
  titulo: "Lección ficticia",
  version: "0".repeat(64),
  escenas: [
    escena("E01", "animacion"),
    escena("E02", "camara"),
    escena("E03", "voz", {
      grabada: true,
      toma: "grabaciones/E03.wav",
      version_toma: 1,
    }),
    escena("E04", "voz", {
      cues: [
        { texto: "Abre App punto jsx y escribe <script>alert(1)</script> sin miedo." },
        { texto: "Segunda frase inventada.", pausa: 2 },
      ],
    }),
    escena("E05", "voz"),
  ],
  montaje: null,
  previa: {
    ruta: null,
    existe: false,
    desactualizada: false,
    version: null,
    trabajo: null,
  },
};

const lecciones = [
  { curso: "curso-ficticio", numero: 2, titulo: "Otra lección ficticia", nombreCurso: "Curso ficticio" },
  { curso: "curso-ficticio", numero: 4, titulo: "Lección ficticia", nombreCurso: "Curso ficticio" },
];

const seleccion = { curso: "curso-ficticio", numero: 4 };

type OpcionesGrabadora = { mimeType?: string; audioBitsPerSecond?: number };

const grabadoras: GrabadoraFalsa[] = [];

class GrabadoraFalsa {
  static isTypeSupported = vi.fn((tipo: string) => tipo === "audio/webm;codecs=opus");
  state: "inactive" | "recording" = "inactive";
  mimeType: string;
  intervalo: number | undefined;
  ondataavailable: ((evento: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public flujo: unknown,
    public opciones?: OpcionesGrabadora,
  ) {
    this.mimeType = opciones?.mimeType ?? "";
    grabadoras.push(this);
  }

  start(intervalo?: number) {
    this.state = "recording";
    this.intervalo = intervalo;
  }

  stop() {
    this.state = "inactive";
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(["audio inventado"], { type: this.mimeType }) });
      this.onstop?.();
    });
  }
}

class ContextoFalso {
  createAnalyser() {
    return { fftSize: 0, getFloatTimeDomainData: () => undefined };
  }
  createMediaStreamSource() {
    return { connect: () => undefined };
  }
  decodeAudioData = vi.fn(async () => ({
    numberOfChannels: 1,
    length: 4,
    sampleRate: 48000,
    getChannelData: () => new Float32Array([0, 0.5, -0.5, 0]),
  }));
  close = vi.fn(async () => undefined);
}

const pista = { stop: vi.fn() };
const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  grabadoras.length = 0;
  vi.stubGlobal("MediaRecorder", GrabadoraFalsa);
  vi.stubGlobal("AudioContext", ContextoFalso);
  getUserMedia.mockResolvedValue({ getTracks: () => [pista] });
  enumerateDevices.mockResolvedValue([
    { kind: "audioinput", deviceId: "default", label: "Predeterminado del sistema" },
    { kind: "audioinput", deviceId: "micro-uno", label: "Micro inventado" },
    { kind: "videoinput", deviceId: "camara-uno", label: "Cámara inventada" },
  ]);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia, enumerateDevices },
  });
  vi.mocked(subirToma).mockResolvedValue({
    escena: "E04",
    ruta: "grabaciones/E04.wav",
    version: 3,
    bytes: 52,
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

function pintar() {
  return render(<Teleprompter datos={datos} lecciones={lecciones} seleccion={seleccion} />);
}

describe("Teleprompter", () => {
  it("muestra E03 ✓ y E04 sin la escena de animación, y abre en E04", () => {
    pintar();

    const barra = screen.getByRole("navigation", { name: "Escenas" });
    expect(within(barra).getByRole("button", { name: "E03 ✓" })).toBeInTheDocument();
    expect(within(barra).getByRole("button", { name: "E04" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(within(barra).queryByRole("button", { name: /E01/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "E04 · Escena ficticia E04",
    );
    expect(screen.getByText("Voz en off · leer")).toBeInTheDocument();
    expect(screen.getByText(/^≈ \d+:\d{2} a 150 ppm$/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Pulsa Grabar cuando estés listo.");
  });

  it("pinta los nombres de archivo en su forma escrita y el HTML como texto", () => {
    const { container } = pintar();

    expect(screen.getByText("App.jsx")).toHaveClass("p");
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("⏸ Pausa para pensar: sigue en silencio")).toBeInTheDocument();
  });

  it("ofrece las lecciones con su curso y número y navega al cambiarla", async () => {
    pintar();

    const selector = screen.getByLabelText("Lección");
    expect(selector).toHaveValue("curso-ficticio/4");
    expect(
      within(selector).getByRole("option", { name: "Curso ficticio · 4: Lección ficticia" }),
    ).toBeInTheDocument();

    await userEvent.selectOptions(selector, "curso-ficticio/2");
    expect(router.push).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=2");
  });

  it("Espacio ensaya y muestra la cuenta atrás del ensayo", async () => {
    pintar();

    await userEvent.keyboard(" ");

    expect(await screen.findByText("ensayo: no se graba")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Parar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeDisabled();
  });

  it("→ pasa a la escena siguiente, pero no con el foco en un campo", async () => {
    pintar();

    screen.getByLabelText("Ritmo").focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E04 ·");

    act(() => (document.activeElement as HTMLElement).blur());
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E05 ·");

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E04 ·");
  });

  it("una escena a cámara se ve con su texto y no deja grabar", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "E02" }));

    expect(screen.getByText("Cámara · con tus palabras")).toBeInTheDocument();
    expect(screen.getByText(/se graba con tu cámara: E02\.mov$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Empezar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Editar texto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar texto" })).toHaveAttribute(
      "title",
      "Llega con la siguiente tarea",
    );
  });

  it("si se deniega el micrófono lo dice y los botones vuelven a su estado", async () => {
    getUserMedia.mockRejectedValue(new Error("Permiso denegado"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));

    expect(await screen.findByText("No se puede usar el micrófono: Permiso denegado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Parar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Repetir/ })).toBeDisabled();
  });

  it("Grabar y Parar suben la toma en WAV y la dejan para escuchar", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    expect(await screen.findByText("Silencio")).toBeInTheDocument();
    expect(
      screen.getByText("dos segundos sin hablar ni moverte (sirve para limpiar el ruido)"),
    ).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        deviceId: undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    expect(grabadoras[0].opciones).toEqual({
      mimeType: "audio/webm;codecs=opus",
      audioBitsPerSecond: 256000,
    });
    expect(grabadoras[0].intervalo).toBe(250);

    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));

    await waitFor(() => expect(subirToma).toHaveBeenCalledTimes(1));
    const [curso, numero, idEscena, wav] = vi.mocked(subirToma).mock.calls[0];
    expect([curso, numero, idEscena]).toEqual(["curso-ficticio", 4, "E04"]);
    expect(wav).toBeInstanceOf(Blob);
    expect(wav.type).toBe("audio/wav");

    expect(
      await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →."),
    ).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "E04 ✓" })).toBeInTheDocument();
    const audio = screen.getByTestId("toma");
    expect(audio.getAttribute("src")).toContain(encodeURIComponent("grabaciones/E04.wav"));
    expect(audio.getAttribute("src")).toMatch(/&v=3$/);
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeEnabled();
    expect(screen.getByLabelText("Micrófono")).toHaveTextContent("Micro inventado");
  });

  it("si la subida falla, lo dice", async () => {
    vi.mocked(subirToma).mockRejectedValue(new Error("La API no responde"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));

    expect(await screen.findByText("No se pudo guardar: La API no responde")).toBeInTheDocument();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("la toma ya grabada se carga con su versión", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "E03 ✓" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Ya grabada: E03.wav (puedes repetirla).",
    );
    expect(screen.getByTestId("toma").getAttribute("src")).toMatch(/&v=1$/);
  });

  it("guarda la lección abierta y el ritmo en las preferencias", async () => {
    pintar();

    fireEvent.change(screen.getByLabelText("Ritmo"), { target: { value: "160" } });

    expect(screen.getByText(/^≈ \d+:\d{2} a 160 ppm$/)).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) ?? "{}")).toMatchObject({
      ritmo: 160,
      leccion: { curso: "curso-ficticio", numero: 4 },
    });
  });

  it("no se rompe con localStorage caído (lanza al acceder)", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Acceso denegado", "SecurityError");
    });

    pintar();
    fireEvent.change(screen.getByLabelText("Letra"), { target: { value: "60" } });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E04 ·");
    expect(screen.getByLabelText("Letra")).toHaveValue("60");
  });
});

describe("Teleprompter sin lección en la URL", () => {
  it("abre la última lección usada", async () => {
    window.localStorage.setItem(
      CLAVE_PREFERENCIAS,
      JSON.stringify({ leccion: { curso: "curso-ficticio", numero: 4 } }),
    );

    render(<Teleprompter datos={null} lecciones={lecciones} seleccion={null} />);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=4"),
    );
  });

  it("si no hay preferencia, abre la primera lección con guion", async () => {
    render(<Teleprompter datos={null} lecciones={lecciones} seleccion={null} />);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=2"),
    );
  });

  it("ignora una preferencia que ya no está entre las lecciones con guion", async () => {
    window.localStorage.setItem(
      CLAVE_PREFERENCIAS,
      JSON.stringify({ leccion: { curso: "curso-ficticio", numero: 9 } }),
    );

    render(<Teleprompter datos={null} lecciones={lecciones} seleccion={null} />);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=2"),
    );
  });

  it("dice que no hay lecciones con guion si la lista está vacía", () => {
    render(<Teleprompter datos={null} lecciones={[]} seleccion={null} />);

    expect(screen.getByText("Aún no hay ninguna lección con guion.")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("una lección sin guion lo dice", () => {
    render(
      <Teleprompter
        datos={null}
        lecciones={lecciones}
        seleccion={{ curso: "curso-ficticio", numero: 9 }}
      />,
    );

    expect(screen.getByText("Esta lección aún no tiene guion")).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
