import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BarraNavegacion } from "@/components/BarraNavegacion";
import { subirEntrega } from "@/components/entregas/subirEntrega";
import { Teleprompter } from "@/components/teleprompter/Teleprompter";
import { leerEntregas } from "@/lib/acciones-entregas";
import { lanzarAccion } from "@/lib/acciones-estudio";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import { leerTrabajo } from "@/lib/trabajos";
import { subirToma } from "@/lib/teleprompter/grabadora";
import { CLAVE_PREFERENCIAS } from "@/lib/teleprompter/preferencias";
import { objetivoToma } from "@/lib/teleprompter/previa";
import { calcularPlan } from "@/lib/teleprompter/ritmo";
import type {
  EscenaTeleprompter,
  Montaje,
  Teleprompter as DatosTeleprompter,
} from "@/lib/tipos";

const router = { replace: vi.fn(), push: vi.fn(), refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/teleprompter",
}));

vi.mock("@/lib/teleprompter/grabadora", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/teleprompter/grabadora")>();
  return { ...original, subirToma: vi.fn() };
});

vi.mock("@/lib/acciones-teleprompter", () => ({
  guardarTextos: vi.fn(),
  generarPreviaGrabacion: vi.fn(),
}));

vi.mock("@/lib/trabajos", () => ({
  leerTrabajo: vi.fn(),
}));

vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));

vi.mock("@/components/entregas/subirEntrega", () => ({ subirEntrega: vi.fn() }));

vi.mock("@/lib/acciones-entregas", () => ({
  leerEntregas: vi.fn(async () => ({
    ok: true,
    entregas: { archivos: [], propuesta: null, destinos: { camara: [], ganchos: [] } },
  })),
  quitarEntrega: vi.fn(),
  colocarTomas: vi.fn(),
}));

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
  ganchos: [],
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

const contextos: ContextoFalso[] = [];

class ContextoFalso {
  constructor() {
    contextos.push(this);
  }
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

const pista = { stop: vi.fn(), label: "Wireless microphone" };
const getUserMedia = vi.fn();
const enumerateDevices = vi.fn();
const avisosDispositivos = new Set<EventListener>();

function avisarCambioDispositivos() {
  for (const aviso of avisosDispositivos) aviso(new Event("devicechange"));
}

function flujoDe(pistaAudio: { stop: () => void; label: string }) {
  return {
    getTracks: () => [pistaAudio],
    getAudioTracks: () => [pistaAudio],
  };
}

function flujoFalso() {
  const pistaPropia = { stop: vi.fn(), label: "Wireless microphone" };
  return { pista: pistaPropia, flujo: flujoDe(pistaPropia) };
}

function diferido<T>() {
  let resolver!: (valor: T) => void;
  const promesa = new Promise<T>((resolve) => {
    resolver = resolve;
  });
  return { promesa, resolver };
}

beforeEach(() => {
  window.localStorage.clear();
  grabadoras.length = 0;
  contextos.length = 0;
  vi.stubGlobal("MediaRecorder", GrabadoraFalsa);
  vi.stubGlobal("AudioContext", ContextoFalso);
  getUserMedia.mockReset();
  avisosDispositivos.clear();
  vi.mocked(subirToma).mockReset();
  getUserMedia.mockResolvedValue(flujoDe(pista));
  enumerateDevices.mockResolvedValue([
    { kind: "audioinput", deviceId: "default", label: "Predeterminado del sistema" },
    { kind: "audioinput", deviceId: "micro-uno", label: "Micro inventado" },
    { kind: "videoinput", deviceId: "camara-uno", label: "Cámara inventada" },
  ]);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia,
      enumerateDevices,
      addEventListener: (_tipo: string, aviso: EventListener) => avisosDispositivos.add(aviso),
      removeEventListener: (_tipo: string, aviso: EventListener) => avisosDispositivos.delete(aviso),
    },
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

function pintar(datosPrueba: DatosTeleprompter = datos) {
  return render(<Teleprompter datos={datosPrueba} lecciones={lecciones} seleccion={seleccion} />);
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

    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));

    expect(screen.getByText("Cámara · con tus palabras")).toBeInTheDocument();
    expect(screen.getByText(/se graba con tu cámara: E02\.mov$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Empezar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Editar texto" })).toBeEnabled();
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

describe("Teleprompter: selección y prueba del micrófono", () => {
  it("se monta sin MediaDevices", () => {
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });

    expect(() => pintar()).not.toThrow();
    expect(screen.getByLabelText("Micrófono")).toHaveTextContent("Predeterminado");
  });

  it("lista al entrar solo los micrófonos identificados y no muestra default", async () => {
    enumerateDevices.mockResolvedValueOnce([
      { kind: "audioinput", deviceId: "", label: "" },
      { kind: "audioinput", deviceId: "default", label: "Predeterminado del sistema" },
      { kind: "audioinput", deviceId: "micro-usb", label: "Wireless microphone" },
    ]);

    pintar();

    const selector = screen.getByLabelText("Micrófono");
    await waitFor(() => expect(selector).toHaveTextContent("Wireless microphone"));
    expect(selector).not.toHaveTextContent("Predeterminado del sistema");
    expect(within(selector).getAllByRole("option")).toHaveLength(2);
  });

  it("vuelve a listar con devicechange y muestra el micrófono conectado", async () => {
    enumerateDevices.mockResolvedValueOnce([
      { kind: "audioinput", deviceId: "default", label: "Predeterminado del sistema" },
    ]);
    pintar();
    await waitFor(() => expect(enumerateDevices).toHaveBeenCalledTimes(1));

    enumerateDevices.mockResolvedValue([
      { kind: "audioinput", deviceId: "default", label: "Predeterminado del sistema" },
      { kind: "audioinput", deviceId: "micro-nuevo", label: "Wireless microphone" },
    ]);
    act(() => avisarCambioDispositivos());

    expect(await screen.findByRole("option", { name: "Wireless microphone" })).toBeInTheDocument();
  });

  it("prueba el micrófono sin crear una grabadora y deja el flujo listo", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Probar micrófono" }));

    expect(
      await screen.findByText(
        "Micrófono listo: Wireless microphone. Habla y mira la barra de nivel.",
      ),
    ).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(grabadoras).toHaveLength(0);
  });

  it("explica los permisos de Chrome y macOS cuando se deniega el micrófono", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Permiso denegado", "NotAllowedError"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Probar micrófono" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "No se puede usar el micrófono: Permiso denegado Revisa el permiso del micrófono de esta página en Chrome y, en el Mac, Ajustes del Sistema → Privacidad y seguridad → Micrófono → Google Chrome.",
    );
  });

  it("da la misma ayuda de permisos al intentar grabar", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Permiso denegado", "NotAllowedError"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "No se puede usar el micrófono: Permiso denegado Revisa el permiso del micrófono de esta página en Chrome y, en el Mac, Ajustes del Sistema → Privacidad y seguridad → Micrófono → Google Chrome.",
    );
  });

  it("avisa con el predeterminado del MacBook y no con un micrófono inalámbrico", async () => {
    enumerateDevices.mockResolvedValueOnce([
      {
        kind: "audioinput",
        deviceId: "default",
        label: "Predeterminado - Micrófono del MacBook Pro",
      },
    ]);
    pintar();

    expect(
      await screen.findByText("Vas a grabar con el micrófono del portátil"),
    ).toHaveClass("text-ambar");

    enumerateDevices.mockResolvedValue([
      { kind: "audioinput", deviceId: "default", label: "Wireless microphone" },
    ]);
    act(() => avisarCambioDispositivos());

    await waitFor(() =>
      expect(
        screen.queryByText("Vas a grabar con el micrófono del portátil"),
      ).not.toBeInTheDocument(),
    );
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

describe("Teleprompter: micrófono sin fugas ni carreras", () => {
  it("si se desmonta con el permiso pendiente, cierra el flujo al llegar y no crea AudioContext", async () => {
    const permiso = diferido<unknown>();
    getUserMedia.mockReturnValueOnce(permiso.promesa);
    const { unmount } = pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    unmount();
    const { pista: pistaTardia, flujo } = flujoFalso();
    await act(async () => permiso.resolver(flujo));

    await waitFor(() => expect(pistaTardia.stop).toHaveBeenCalled());
    expect(contextos).toHaveLength(0);
    expect(grabadoras).toHaveLength(0);
  });

  it("si se desmonta mientras cambia de micrófono, cierra el flujo nuevo al llegar", async () => {
    const primero = flujoFalso();
    getUserMedia.mockResolvedValueOnce(primero.flujo);
    const { unmount } = pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");

    const permiso = diferido<unknown>();
    getUserMedia.mockReturnValueOnce(permiso.promesa);
    await userEvent.selectOptions(screen.getByLabelText("Micrófono"), "micro-uno");
    expect(primero.pista.stop).toHaveBeenCalled();
    unmount();
    const segundo = flujoFalso();
    await act(async () => permiso.resolver(segundo.flujo));

    await waitFor(() => expect(segundo.pista.stop).toHaveBeenCalled());
    expect(contextos).toHaveLength(1);
    expect(contextos[0].close).toHaveBeenCalled();
  });

  it("Parar con el permiso pendiente y volver a Grabar abre un solo flujo y sube la toma viva", async () => {
    const permiso = diferido<unknown>();
    getUserMedia.mockReturnValueOnce(permiso.promesa);
    const { unmount } = pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    const unico = flujoFalso();
    await act(async () => permiso.resolver(unico.flujo));

    expect(await screen.findByText("Silencio")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(grabadoras).toHaveLength(1);
    expect(grabadoras[0].flujo).toBe(unico.flujo);
    expect(subirToma).toHaveBeenCalledTimes(1);
    expect(unico.pista.stop).not.toHaveBeenCalled();
    unmount();
    expect(unico.pista.stop).toHaveBeenCalled();
  });

  it("Parar con el permiso pendiente vuelve al estado de la escena y no graba al llegar el permiso", async () => {
    const permiso = diferido<unknown>();
    getUserMedia.mockReturnValueOnce(permiso.promesa);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    const { flujo } = flujoFalso();
    await act(async () => permiso.resolver(flujo));

    expect(screen.getByRole("status")).toHaveTextContent("Pulsa Grabar cuando estés listo.");
    expect(grabadoras).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeEnabled();
  });

  it("cambiar de micrófono y Grabar enseguida graba con el micro nuevo y cierra el viejo", async () => {
    const primero = flujoFalso();
    getUserMedia.mockResolvedValueOnce(primero.flujo);
    const { unmount } = pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");

    const permiso = diferido<unknown>();
    getUserMedia.mockReturnValueOnce(permiso.promesa);
    await userEvent.selectOptions(screen.getByLabelText("Micrófono"), "micro-uno");
    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    const segundo = flujoFalso();
    await act(async () => permiso.resolver(segundo.flujo));

    expect(await screen.findByText("Silencio")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await waitFor(() => expect(subirToma).toHaveBeenCalledTimes(2));

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia).toHaveBeenLastCalledWith({
      audio: expect.objectContaining({ deviceId: { exact: "micro-uno" } }),
    });
    expect(grabadoras).toHaveLength(2);
    expect(grabadoras[1].flujo).toBe(segundo.flujo);
    expect(primero.pista.stop).toHaveBeenCalled();
    expect(segundo.pista.stop).not.toHaveBeenCalled();
    expect(contextos).toHaveLength(1);
    unmount();
    expect(segundo.pista.stop).toHaveBeenCalled();
  });
});

describe("Teleprompter: controles bloqueados y tomas sin subir", () => {
  it("no deja cambiar de lección ni de escena mientras se graba o se guarda", async () => {
    const subida = diferido<Awaited<ReturnType<typeof subirToma>>>();
    vi.mocked(subirToma).mockReturnValueOnce(subida.promesa);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    expect(screen.getByLabelText("Lección")).toBeDisabled();
    expect(screen.getByRole("button", { name: "E03 ✓" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await waitFor(() => expect(subirToma).toHaveBeenCalled());
    expect(screen.getByLabelText("Lección")).toBeDisabled();
    expect(screen.getByRole("button", { name: "E03 ✓" })).toBeDisabled();

    await act(async () =>
      subida.resolver({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 }),
    );
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");
    expect(screen.getByLabelText("Lección")).toBeEnabled();
    expect(screen.getByRole("button", { name: "E03 ✓" })).toBeEnabled();
  });

  it("si la subida falla, Reintentar sube el mismo WAV a la misma escena aunque te hayas movido", async () => {
    vi.mocked(subirToma).mockRejectedValueOnce(new Error("La API no responde"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    expect(await screen.findByText("No se pudo guardar: La API no responde")).toBeInTheDocument();
    const wav = vi.mocked(subirToma).mock.calls[0][3];

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E05 ·");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));

    expect(
      await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →."),
    ).toBeInTheDocument();
    expect(subirToma).toHaveBeenCalledTimes(2);
    const [curso, numero, idEscena, mismoWav] = vi.mocked(subirToma).mock.calls[1];
    expect([curso, numero, idEscena]).toEqual(["curso-ficticio", 4, "E04"]);
    expect(mismoWav).toBe(wav);
    expect(screen.queryByRole("button", { name: "Reintentar subida" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "E04 ✓" })).toBeInTheDocument();
  });

  it("si el reintento también falla, la toma sigue esperando", async () => {
    vi.mocked(subirToma)
      .mockRejectedValueOnce(new Error("La API no responde"))
      .mockRejectedValueOnce(new Error("Sigue sin responder"));
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar subida" }));

    expect(await screen.findByText("No se pudo guardar: Sigue sin responder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar subida" })).toBeEnabled();
  });

  it("cambiar de lección con una toma sin subir pide confirmación", async () => {
    vi.mocked(subirToma).mockRejectedValueOnce(new Error("La API no responde"));
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByRole("button", { name: "Reintentar subida" });

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");
    expect(confirmar).toHaveBeenCalledWith("Hay una toma sin guardar. ¿Descartarla?");
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Lección")).toHaveValue("curso-ficticio/4");

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");
    expect(router.push).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=2");
  });

  it("sin tomas pendientes cambia de lección sin preguntar", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    pintar();

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");

    expect(confirmar).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalled();
  });
});

describe("Teleprompter con temporizadores falsos", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));
  const CUENTA_GRABAR_MS = 2000 + 700 * 3;

  it("Parar con la animación en marcha sube la toma y para la animación", async () => {
    pintar();

    fireEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await avanzar(CUENTA_GRABAR_MS + 50);
    expect(screen.getByRole("status")).toHaveTextContent("● Grabando…");
    await avanzar(1500);
    const dichasAlParar = document.querySelectorAll(".p.dicha").length;
    expect(dichasAlParar).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await vi.waitFor(() => expect(subirToma).toHaveBeenCalledTimes(1));
    await avanzar(3000);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Guardada: E04.wav. Escúchala o pasa a la siguiente con →.",
    );
    expect(document.querySelectorAll(".p.dicha")).toHaveLength(dichasAlParar);
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeEnabled();
  });

  it("grabando, corta solo a max(15, total·0,5) s después del texto", async () => {
    const total = calcularPlan([{ texto: "Una frase inventada para probar.", pausa: 0 }], 150).total;
    const margen = Math.max(15, total * 0.5);
    pintar();

    fireEvent.keyDown(document.body, { code: "ArrowRight", key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E05 ·");
    fireEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await avanzar(CUENTA_GRABAR_MS);
    await avanzar((total + margen) * 1000 - 500);
    expect(subirToma).not.toHaveBeenCalled();

    await avanzar(1000);
    await vi.waitFor(() => expect(subirToma).toHaveBeenCalledTimes(1));
    expect(vi.mocked(subirToma).mock.calls[0][2]).toBe("E05");
  });

  it("al desmontar en plena lectura no deja rAF, micro, contexto ni temporizadores", async () => {
    const { unmount } = pintar();

    fireEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await avanzar(CUENTA_GRABAR_MS + 500);
    expect(screen.getByRole("status")).toHaveTextContent("● Grabando…");

    unmount();

    expect(pista.stop).toHaveBeenCalled();
    expect(contextos).toHaveLength(1);
    expect(contextos[0].close).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("al desmontar durante la cuenta atrás tampoco deja temporizadores", async () => {
    const { unmount } = pintar();

    fireEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await avanzar(500);
    expect(screen.getByText("Silencio")).toBeInTheDocument();

    unmount();

    expect(pista.stop).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------- tarea 8 ----------

const montaje: Montaje = {
  fps: 30,
  duracion: 1200,
  escenas: [
    { id: "E01", modo: "animacion", inicio: 0, duracion: 150, cues: [] },
    { id: "E02", modo: "camara", inicio: 150, duracion: 150, cues: [0] },
    { id: "E03", modo: "voz", inicio: 300, duracion: 150, cues: [0] },
    { id: "E04", modo: "voz", inicio: 450, duracion: 300, cues: [0, 150] },
    { id: "E05", modo: "voz", inicio: 750, duracion: 150, cues: [0] },
  ],
};

const conPrevia: DatosTeleprompter = {
  ...datos,
  montaje,
  previa: {
    ruta: "out/previas-grabacion/curso-ficticio-04.mp4",
    existe: true,
    desactualizada: false,
    version: 5,
    trabajo: null,
  },
};

// jsdom no reproduce vídeo: se simulan las propiedades que usa la sincronía.
function medioFalso(elemento: HTMLMediaElement, propiedades: Record<string, unknown> = {}) {
  const estado = { paused: true, currentTime: 0, playbackRate: 1, readyState: 4, ...propiedades };
  for (const clave of Object.keys(estado) as Array<keyof typeof estado>) {
    Object.defineProperty(elemento, clave, {
      configurable: true,
      get: () => estado[clave],
      set: (valor) => {
        (estado as Record<string, unknown>)[clave] = valor;
      },
    });
  }
  const play = vi.fn(async () => {
    estado.paused = false;
  });
  const pause = vi.fn(() => {
    estado.paused = true;
  });
  Object.defineProperty(elemento, "play", { configurable: true, value: play });
  Object.defineProperty(elemento, "pause", { configurable: true, value: pause });
  return { estado, play, pause };
}

describe("Teleprompter: escenas a cámara", () => {
  it("muestran 🎥, sus puntos, la línea de cámara y la zona de entrega; Grabar está desactivado", async () => {
    pintar({
      ...datos,
      escenas: datos.escenas.map((e) => (e.id === "E02" ? { ...e, grabada: true } : e)),
    });

    await userEvent.click(screen.getByRole("button", { name: "E02 🎥 ✓" }));

    expect(screen.getByText("🎥 Se graba con la cámara · horizontal")).toBeInTheDocument();
    expect(screen.getByText("✓ Grabada")).toBeInTheDocument();
    expect(screen.getByText("Un punto inventado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeDisabled();
    const zona = screen.getByRole("region", { name: "Entregar las tomas de cámara" });
    expect(within(zona).getByLabelText(/Entregar los vídeos de la cámara/)).toHaveAttribute(
      "type",
      "file",
    );
    expect(
      screen.queryByRole("button", { name: "⬆ Entregar los vídeos de la cámara" }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(leerEntregas).toHaveBeenCalledWith("curso-ficticio", 4));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Pulsa Empezar y dale a grabar en tu cámara durante la cuenta atrás.",
    );
  });

  it("una escena a cámara sin toma no dice «✓ Grabada»", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));

    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toBeInTheDocument();
    expect(screen.queryByText("✓ Grabada")).not.toBeInTheDocument();
  });

  it("las escenas de voz no tienen la zona de entrega ni cambian la vista", async () => {
    pintar();

    expect(
      screen.queryByRole("region", { name: "Entregar las tomas de cámara" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Entregar los vídeos de la cámara/)).not.toBeVisible();
    expect(screen.queryByRole("button", { name: "Ver solo puntos" })).not.toBeInTheDocument();

    // Volver de una escena a cámara a una de voz también la quita de la vista.
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "E05" }));
    expect(
      screen.queryByRole("region", { name: "Entregar las tomas de cámara" }),
    ).not.toBeInTheDocument();
  });

  it("la zona de entrega sigue montada al pasar por una escena de voz: no se pierde una subida", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    const zona = screen.getByRole("region", { name: "Entregar las tomas de cámara" });
    await userEvent.click(screen.getByRole("button", { name: "E05" }));

    expect(zona).toBeInTheDocument();
    expect(zona).not.toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toBe(zona);
    expect(leerEntregas).toHaveBeenCalledOnce();
  });

  it("cambiar de lección con una subida de tomas en curso pide confirmación y, si se cancela, no cambia", async () => {
    let terminar!: () => void;
    vi.mocked(subirEntrega).mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = () => resolver({ ok: true, archivo: "Toma ficticia.MOV", bytes: 6 });
        }),
    );
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: false, mensaje: "No hay tomas entregadas" });
    const confirmar = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    const entrada = screen.getByLabelText(/Entregar los vídeos de la cámara/);
    fireEvent.drop(entrada.closest("label") as HTMLElement, {
      dataTransfer: {
        files: [new File(["ftypqt"], "Toma ficticia.MOV", { type: "video/quicktime" })],
        types: ["Files"],
      },
    });
    await waitFor(() => expect(subirEntrega).toHaveBeenCalledOnce());

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");
    expect(confirmar).toHaveBeenCalledWith(
      "Hay una subida de tomas en curso. ¿Cortarla y cambiar de lección?",
    );
    expect(router.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Lección")).toHaveValue("curso-ficticio/4");

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");
    expect(router.push).toHaveBeenCalledWith("/teleprompter?curso=curso-ficticio&leccion=2");
    await act(async () => terminar());
  });

  it("con la subida ya terminada cambia de lección sin preguntar por ella", async () => {
    vi.mocked(subirEntrega).mockResolvedValue({ ok: true, archivo: "Toma ficticia.MOV", bytes: 6 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: false, mensaje: "No hay tomas entregadas" });
    const confirmar = vi.spyOn(window, "confirm");
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    fireEvent.drop(
      screen.getByLabelText(/Entregar los vídeos de la cámara/).closest("label") as HTMLElement,
      {
        dataTransfer: {
          files: [new File(["ftypqt"], "Toma ficticia.MOV", { type: "video/quicktime" })],
          types: ["Files"],
        },
      },
    );
    await waitFor(() => expect(screen.getByText("Subida")).toBeInTheDocument());

    await userEvent.selectOptions(screen.getByLabelText("Lección"), "curso-ficticio/2");

    expect(confirmar).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalled();
  });

  it("los atajos no se disparan con el foco en un botón de la zona de entrega", async () => {
    vi.mocked(leerEntregas).mockResolvedValueOnce({
      ok: true,
      entregas: {
        archivos: [{ archivo: "Toma ficticia.MOV", bytes: 6 }],
        propuesta: null,
        destinos: { camara: [], ganchos: [] },
      },
    });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    const quitar = await screen.findByRole("button", { name: "Quitar Toma ficticia.MOV" });

    quitar.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E02 ·");
    fireEvent.keyDown(quitar, { code: "Space", key: " " });
    expect(screen.queryByText("dale a grabar en la cámara")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Parar/ })).toBeDisabled();

    // Fuera de la zona, los atajos siguen funcionando.
    act(() => quitar.blur());
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E03 ·");
  });

  it("una lección sin escenas a cámara no monta la zona de entrega", () => {
    pintar({ ...datos, escenas: datos.escenas.filter(({ modo }) => modo !== "camara") });

    expect(screen.queryByLabelText(/Entregar los vídeos de la cámara/)).not.toBeInTheDocument();
    expect(leerEntregas).not.toHaveBeenCalled();
  });

  it("Empezar hace la cuenta atrás de cámara", async () => {
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));

    await userEvent.click(screen.getByRole("button", { name: /Empezar/ }));

    expect(await screen.findByText("dale a grabar en la cámara")).toBeInTheDocument();
  });

  it("«Ver solo puntos» cambia la vista, la recuerda y Empezar solo pone el cronómetro", async () => {
    const { container } = pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));

    await userEvent.click(screen.getByRole("button", { name: "Ver solo puntos" }));

    expect(screen.getByRole("button", { name: "Ver guion con ritmo" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) ?? "{}")).toMatchObject({
      vistaCamara: "puntos",
    });
    expect(container.querySelectorAll(".p")).toHaveLength(0);
    expect(screen.getByText("Un punto inventado")).toBeInTheDocument();
    expect(screen.getByText(/^objetivo ≈ \d+:\d{2} · se graba con tu cámara: E02\.mov$/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Empezar pone en marcha el cronómetro.");

    await userEvent.click(screen.getByRole("button", { name: /Empezar/ }));
    expect(screen.getByRole("status")).toHaveTextContent("Cronómetro en marcha.");
    expect(screen.queryByText("dale a grabar en la cámara")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));

    await userEvent.click(screen.getByRole("button", { name: "Ver guion con ritmo" }));
    expect(container.querySelectorAll(".p").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Ver solo puntos" })).toBeInTheDocument();
  });
});

describe("Teleprompter: edición del texto", () => {
  const nuevaVersion = "1".repeat(64);

  function devuelto(textos: string[]): DatosTeleprompter {
    return {
      ...datos,
      version: nuevaVersion,
      escenas: datos.escenas.map((e) =>
        e.id === "E04" ? { ...e, cues: e.cues.map((cue, i) => ({ ...cue, texto: textos[i] })) } : e,
      ),
    };
  }

  it("Editar texto pasa las frases a campos y bloquea ensayar, grabar y los atajos", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Corrige el texto y pulsa Guardar texto.");

    act(() => (document.activeElement as HTMLElement | null)?.blur());
    await userEvent.keyboard(" ");
    expect(screen.queryByText("ensayo: no se graba")).not.toBeInTheDocument();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E04 ·");
    expect(screen.getByRole("button", { name: "E05" })).toBeDisabled();
  });

  it("al guardar usa el guion devuelto sin esperar a refrescar, también su versión", async () => {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: true,
      teleprompter: devuelto(["Frase cambiada a mano.", "Segunda frase inventada."]),
    });
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
    const frase = screen.getByLabelText("Frase 1");
    await userEvent.clear(frase);
    await userEvent.type(frase, "Frase cambiada a mano.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(guardarTextos).toHaveBeenCalledWith({
      curso: "curso-ficticio",
      numero: 4,
      version: "0".repeat(64),
      escenas: [
        { id: "E04", cues: ["Frase cambiada a mano.", "Segunda frase inventada."] },
      ],
    });
    expect(await screen.findByText("Texto guardado en el guion.")).toBeInTheDocument();
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByText("cambiada")).toHaveClass("p");
    expect(router.refresh).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeEnabled();

    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: true,
      teleprompter: devuelto(["Otra vez.", "Segunda frase inventada."]),
    });
    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(vi.mocked(guardarTextos).mock.calls[1][0]).toMatchObject({ version: nuevaVersion });
  });

  it("Cancelar vuelve al texto sin guardar", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Pulsa Grabar cuando estés listo.");
    expect(guardarTextos).not.toHaveBeenCalled();
  });

  it("en una escena a cámara edita los puntos", async () => {
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "E02 🎥" }));

    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));

    expect(screen.getByLabelText("Punto 1")).toHaveValue("Un punto inventado");
    expect(screen.getByRole("button", { name: "Ver solo puntos" })).toBeDisabled();
  });
});

describe("Teleprompter: vista previa", () => {
  it("por defecto es Mediana, y Oculta quita el panel y el margen del texto", async () => {
    pintar(conPrevia);

    const selector = screen.getByLabelText("Vista previa");
    expect(selector).toHaveValue("440");
    expect(
      within(selector).getAllByRole("option").map((opcion) => opcion.textContent),
    ).toEqual(["Oculta", "Pequeña", "Mediana", "Grande"]);
    expect(screen.getByRole("complementary", { name: "Vista previa de la escena" })).toBeInTheDocument();
    expect(screen.getByTestId("prompter")).toHaveAttribute("data-con-previa");

    await userEvent.selectOptions(selector, "0");

    expect(screen.queryByRole("complementary", { name: "Vista previa de la escena" })).not.toBeInTheDocument();
    expect(screen.getByTestId("prompter")).not.toHaveAttribute("data-con-previa");
    expect(JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) ?? "{}")).toMatchObject({
      tamPrevia: 0,
    });
  });

  it("sin montaje el panel lo dice", () => {
    pintar();

    expect(screen.getByText("Esta lección aún no tiene montaje.")).toBeInTheDocument();
  });

  it("coloca el vídeo al inicio de la escena al cargar y al cambiar de escena", async () => {
    const { container } = pintar(conPrevia);
    const video = container.querySelector("video")!;
    const { estado } = medioFalso(video);

    fireEvent.loadedMetadata(video);
    expect(estado.currentTime).toBeCloseTo(450 / 30 + 0.05);

    await userEvent.keyboard("{ArrowRight}");
    expect(estado.currentTime).toBeCloseTo(750 / 30 + 0.05);
  });

  it("al escuchar la toma, la vista previa la acompaña con objetivoToma", async () => {
    const { container } = pintar(conPrevia);
    await userEvent.click(screen.getByRole("button", { name: "E03 ✓" }));
    const video = container.querySelector("video")!;
    const previa = medioFalso(video);
    const audio = screen.getByTestId("toma") as HTMLAudioElement;
    const toma = medioFalso(audio, { duration: 10, currentTime: 4, paused: false });

    fireEvent.play(audio);

    const esperado = objetivoToma({
      tiempoToma: 4,
      duracionToma: 10,
      escenaMontaje: montaje.escenas[2],
      fps: 30,
    })!;
    expect(previa.estado.currentTime).toBeCloseTo(esperado.tiempo);
    expect(previa.estado.playbackRate).toBeCloseTo(esperado.ritmo);
    expect(previa.play).toHaveBeenCalled();

    toma.estado.paused = true;
    fireEvent.pause(audio);
    expect(previa.pause).toHaveBeenCalled();
  });
});

describe("Teleprompter: vista previa con temporizadores falsos", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("mientras se lee, el vídeo sigue el texto con objetivoLectura y se para al parar", async () => {
    const { container } = pintar(conPrevia);
    const video = container.querySelector("video")!;
    const previa = medioFalso(video, { currentTime: 450 / 30 + 0.05 });
    const plan = calcularPlan(
      datos.escenas[3].cues.map((cue) => ({ texto: cue.texto, pausa: cue.pausa ?? 0 })),
      150,
    );
    const inicioSegunda = plan.pasos.find((paso) => paso.c === 1)!.desde;
    const ritmo = Math.min(4, Math.max(0.25, 150 / 30 / inicioSegunda));

    fireEvent.click(screen.getByRole("button", { name: /Ensayar/ }));
    await avanzar(2100 + 1000);

    expect(screen.getByRole("status")).toHaveTextContent("Ensayando…");
    expect(previa.play).toHaveBeenCalled();
    expect(previa.estado.playbackRate).toBeCloseTo(ritmo);
    expect(previa.estado.currentTime).toBeGreaterThan(450 / 30 + 0.05);
    expect(previa.estado.currentTime).toBeLessThanOrEqual(450 / 30 + ritmo * 1.05);

    fireEvent.click(screen.getByRole("button", { name: /Parar/ }));
    expect(previa.pause).toHaveBeenCalled();
  });
});

describe("Teleprompter: tomas pendientes", () => {
  async function grabarYParar() {
    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
  }

  function salir() {
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    return evento.defaultPrevented;
  }

  it("con varias pendientes, Reintentar dice cuántas se han subido y cuántas quedan", async () => {
    vi.mocked(subirToma)
      .mockRejectedValueOnce(new Error("La API no responde"))
      .mockRejectedValueOnce(new Error("La API no responde"))
      .mockResolvedValueOnce({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 })
      .mockRejectedValueOnce(new Error("Sigue sin responder"))
      .mockResolvedValueOnce({ escena: "E05", ruta: "grabaciones/E05.wav", version: 1, bytes: 52 });
    pintar();

    await grabarYParar();
    await screen.findByText("No se pudo guardar: La API no responde");
    await userEvent.keyboard("{ArrowRight}");
    await grabarYParar();
    await screen.findByText("No se pudo guardar: La API no responde");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));
    expect(
      await screen.findByText(
        "Subidas: 1 de 2 tomas; queda 1 pendiente. Último error: Sigue sin responder",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "E04 ✓" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));
    expect(await screen.findByText("Guardada: E05.wav. Escúchala o pasa a la siguiente con →.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar subida" })).not.toBeInTheDocument();
  });

  it("si todas las pendientes suben, lo dice", async () => {
    vi.mocked(subirToma)
      .mockRejectedValueOnce(new Error("La API no responde"))
      .mockRejectedValueOnce(new Error("La API no responde"))
      .mockResolvedValueOnce({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 })
      .mockResolvedValueOnce({ escena: "E05", ruta: "grabaciones/E05.wav", version: 1, bytes: 52 });
    pintar();

    await grabarYParar();
    await screen.findByText("No se pudo guardar: La API no responde");
    await userEvent.keyboard("{ArrowRight}");
    await grabarYParar();
    await screen.findByText("No se pudo guardar: La API no responde");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));

    expect(await screen.findByText("Subidas las 2 tomas pendientes.")).toBeInTheDocument();
    expect(router.refresh).toHaveBeenCalled();
  });

  it("salir de la página con una toma sin subir avisa", async () => {
    vi.mocked(subirToma).mockRejectedValueOnce(new Error("La API no responde"));
    pintar();

    expect(salir()).toBe(false);
    await grabarYParar();
    await screen.findByRole("button", { name: "Reintentar subida" });

    expect(salir()).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Reintentar subida" }));
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");
    expect(salir()).toBe(false);
  });

  it("salir mientras se sube una toma también avisa", async () => {
    const subida = diferido<Awaited<ReturnType<typeof subirToma>>>();
    vi.mocked(subirToma).mockReturnValueOnce(subida.promesa);
    pintar();

    await grabarYParar();
    await waitFor(() => expect(subirToma).toHaveBeenCalled());
    expect(salir()).toBe(true);

    await act(async () =>
      subida.resolver({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 }),
    );
    expect(salir()).toBe(false);
  });
});

describe("Teleprompter: subida con tiempo máximo", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("si la subida no acaba en 120 s, cuenta como fallo y deja Reintentar subida", async () => {
    const real = await vi.importActual<typeof import("@/lib/teleprompter/grabadora")>(
      "@/lib/teleprompter/grabadora",
    );
    vi.mocked(subirToma).mockImplementation(real.subirToma);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, opciones: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            opciones.signal?.addEventListener("abort", () =>
              reject(new DOMException("Abortado", "AbortError")),
            );
          }),
      ),
    );
    pintar();

    fireEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await avanzar(2000 + 700 * 3 + 500);
    fireEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await avanzar(119_000);
    expect(screen.queryByRole("button", { name: "Reintentar subida" })).not.toBeInTheDocument();

    await avanzar(1000);
    expect(screen.getByRole("status")).toHaveTextContent(
      "No se pudo guardar: La subida ha tardado más de 2 minutos y se ha cortado",
    );
    expect(screen.getByRole("button", { name: "Reintentar subida" })).toBeEnabled();
  });
});

// ---------- tarea 8, ronda 1 ----------

describe("Teleprompter: ronda 1", () => {
  function salir() {
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    return evento.defaultPrevented;
  }

  it("con la previa Oculta mientras se genera, al acabar refresca y al volver a mostrarla no ofrece generarla", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const trabajo = {
        id: 12,
        accion: "previa-grabacion",
        curso: "curso-ficticio",
        numero: 4,
        objetivo: null,
        estado: "en_marcha" as const,
        progreso: 0.4,
        inicio: "2026-01-01T10:00:00",
        fin: null,
        error: null,
      };
      vi.mocked(leerTrabajo)
        .mockResolvedValueOnce({ ...trabajo, progreso: 0.6 })
        .mockResolvedValueOnce({ ...trabajo, estado: "hecho", progreso: 1 });
      const sinPrevia: DatosTeleprompter = {
        ...datos,
        montaje,
        previa: { ruta: null, existe: false, desactualizada: false, version: null, trabajo },
      };
      const { rerender } = pintar(sinPrevia);
      expect(screen.getByText("40 %")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Vista previa"), { target: { value: "0" } });
      expect(
        screen.queryByRole("complementary", { name: "Vista previa de la escena" }),
      ).not.toBeInTheDocument();

      await act(() => vi.advanceTimersByTimeAsync(2000));
      expect(leerTrabajo).toHaveBeenCalledTimes(1);
      await act(() => vi.advanceTimersByTimeAsync(2000));
      expect(router.refresh).toHaveBeenCalled();

      fireEvent.change(screen.getByLabelText("Vista previa"), { target: { value: "440" } });
      expect(screen.queryByRole("button", { name: "Generar vista previa" })).not.toBeInTheDocument();
      expect(screen.getByText("100 %")).toBeInTheDocument();

      rerender(
        <Teleprompter
          datos={{ ...conPrevia, previa: { ...conPrevia.previa, trabajo: { ...trabajo, estado: "hecho" } } }}
          lecciones={lecciones}
          seleccion={seleccion}
        />,
      );
      await act(() => vi.advanceTimersByTimeAsync(0));
      expect(document.querySelector("video")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("salir mientras se graba avisa", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    expect(salir()).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");
    expect(salir()).toBe(false);
  });

  it("salir con texto sin guardar en el editor avisa", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
    expect(salir()).toBe(false);
    await userEvent.type(screen.getByLabelText("Frase 1"), " más");
    expect(salir()).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(salir()).toBe(false);
  });

  it("Editar texto está desactivado mientras se graba y mientras se sube una toma (también al reintentar)", async () => {
    vi.mocked(subirToma).mockRejectedValueOnce(new Error("La API no responde"));
    const reintento = diferido<Awaited<ReturnType<typeof subirToma>>>();
    vi.mocked(subirToma).mockReturnValueOnce(reintento.promesa);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    expect(screen.getByRole("button", { name: "Editar texto" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar subida" }));

    await waitFor(() => expect(subirToma).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: "Editar texto" })).toBeDisabled();

    await act(async () =>
      reintento.resolver({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 }),
    );
    expect(screen.getByRole("button", { name: "Editar texto" })).toBeEnabled();
  });

  it("al hidratar en una escena a cámara con la vista «puntos» guardada, el estado es el de esa vista", async () => {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify({ vistaCamara: "puntos" }));
    const soloCamara: DatosTeleprompter = {
      ...datos,
      escenas: datos.escenas.map((e) => (e.modo === "voz" ? { ...e, grabada: true } : e)),
    };
    const pagina = (
      <Teleprompter datos={soloCamara} lecciones={lecciones} seleccion={seleccion} />
    );
    const { renderToString } = await import("react-dom/server");
    const contenedor = document.createElement("div");
    contenedor.innerHTML = renderToString(pagina);
    document.body.appendChild(contenedor);

    render(pagina, { container: contenedor, hydrate: true });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E02 ·");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Empezar pone en marcha el cronómetro."),
    );
    contenedor.remove();
  });
});

describe("Teleprompter: ronda final", () => {
  const AVISO_SALIR = "Hay una toma o un texto sin guardar. ¿Salir igualmente?";

  // La barra de navegación de la app encima del teleprompter, como en el layout.
  function pintarConBarra(datosPrueba: DatosTeleprompter = datos) {
    return render(
      <>
        <BarraNavegacion />
        <Teleprompter datos={datosPrueba} lecciones={lecciones} seleccion={seleccion} />
      </>,
    );
  }

  // Los clics en enlaces que llegan al final de su recorrido (donde un <Link> navegaría): si
  // llegan y si llegan ya cancelados. Se cancela aquí para que jsdom no intente navegar de verdad.
  function espiarNavegacion() {
    const llegadas: boolean[] = [];
    const espia = (evento: MouseEvent) => {
      if (!(evento.target instanceof Element) || !evento.target.closest("a[href]")) return;
      llegadas.push(evento.defaultPrevented);
      evento.preventDefault();
    };
    window.addEventListener("click", espia);
    return { llegadas, quitar: () => window.removeEventListener("click", espia) };
  }

  function enlace(nombre: string) {
    return within(screen.getByRole("navigation", { name: "Navegación principal" })).getByRole(
      "link",
      { name: nombre },
    );
  }

  async function grabarYFallarSubida() {
    vi.mocked(subirToma).mockRejectedValueOnce(new Error("La API no responde"));
    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await screen.findByRole("button", { name: "Reintentar subida" });
  }

  it("con una toma pendiente, un enlace de la barra pide confirmación y, si se cancela, no navega", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    pintarConBarra();
    await grabarYFallarSubida();
    const navegacion = espiarNavegacion();
    try {
      await userEvent.click(enlace("Cursos"));
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar).toHaveBeenCalledWith(AVISO_SALIR);
      expect(navegacion.llegadas).toEqual([]);
      expect(screen.getByRole("button", { name: "Reintentar subida" })).toBeInTheDocument();

      await userEvent.click(enlace("Cursos"));
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(navegacion.llegadas).toEqual([false]);
    } finally {
      navegacion.quitar();
    }
  });

  it("también avisa en cualquier enlace de la app, y no en uno de otro origen", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <>
        <a href="/tareas">Enlace interno</a>
        <a href="https://sitio.ejemplo/">Enlace externo</a>
        <Teleprompter datos={datos} lecciones={lecciones} seleccion={seleccion} />
      </>,
    );
    await grabarYFallarSubida();
    const navegacion = espiarNavegacion();
    try {
      await userEvent.click(screen.getByRole("link", { name: "Enlace interno" }));
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(navegacion.llegadas).toEqual([]);

      await userEvent.click(screen.getByRole("link", { name: "Enlace externo" }));
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(navegacion.llegadas).toEqual([false]);
    } finally {
      navegacion.quitar();
    }
  });

  it("sin nada pendiente navega sin preguntar", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    pintarConBarra();
    const navegacion = espiarNavegacion();
    try {
      await userEvent.click(enlace("Tareas"));
      expect(confirmar).not.toHaveBeenCalled();
      expect(navegacion.llegadas).toEqual([false]);
    } finally {
      navegacion.quitar();
    }
  });

  it("avisa mientras se graba y mientras se sube la toma", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    const subida = diferido<Awaited<ReturnType<typeof subirToma>>>();
    vi.mocked(subirToma).mockReturnValueOnce(subida.promesa);
    pintarConBarra();
    const navegacion = espiarNavegacion();
    try {
      await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
      await screen.findByText("Silencio");
      await userEvent.click(enlace("Teleprompter"));
      expect(confirmar).toHaveBeenCalledTimes(1);

      await userEvent.click(screen.getByRole("button", { name: /Parar/ }));
      await waitFor(() => expect(subirToma).toHaveBeenCalled());
      await userEvent.click(enlace("Teleprompter"));
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(navegacion.llegadas).toEqual([]);

      await act(async () =>
        subida.resolver({ escena: "E04", ruta: "grabaciones/E04.wav", version: 3, bytes: 52 }),
      );
      await screen.findByText("Guardada: E04.wav. Escúchala o pasa a la siguiente con →.");
      await userEvent.click(enlace("Teleprompter"));
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(navegacion.llegadas).toEqual([false]);
    } finally {
      navegacion.quitar();
    }
  });

  it("con texto sin guardar en el editor avisa, y con toma y texto pendientes pregunta una sola vez", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    pintarConBarra();
    const navegacion = espiarNavegacion();
    try {
      await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
      await userEvent.type(screen.getByLabelText("Frase 1"), " más");
      await userEvent.click(enlace("Cursos"));
      expect(confirmar).toHaveBeenCalledTimes(1);
      expect(confirmar).toHaveBeenCalledWith(AVISO_SALIR);
      expect(navegacion.llegadas).toEqual([]);
      expect((screen.getByLabelText("Frase 1") as HTMLTextAreaElement).value).toMatch(/ más$/);

      await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
      await grabarYFallarSubida();
      await userEvent.click(screen.getByRole("button", { name: "Editar texto" }));
      await userEvent.type(screen.getByLabelText("Frase 1"), " más");
      confirmar.mockReturnValue(true);
      await userEvent.click(enlace("Cursos"));
      expect(confirmar).toHaveBeenCalledTimes(2);
      expect(navegacion.llegadas).toEqual([false]);
    } finally {
      navegacion.quitar();
    }
  });

  it("la toma se sube a la escena en la que se empezó aunque un refresco cambie la escena visible", async () => {
    const { rerender } = pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("E04 ·");

    // Llega un guion con una escena más delante: el mismo índice ya es otra escena.
    rerender(
      <Teleprompter
        datos={{ ...datos, escenas: [escena("E06", "voz"), ...datos.escenas] }}
        lecciones={lecciones}
        seleccion={seleccion}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent("E04 ·");

    await userEvent.click(screen.getByRole("button", { name: /Parar/ }));

    await waitFor(() => expect(subirToma).toHaveBeenCalledTimes(1));
    expect(vi.mocked(subirToma).mock.calls[0][2]).toBe("E04");
  });

  it("si la grabadora no arranca, lo dice, para todo y cierra el micrófono", async () => {
    class GrabadoraRota extends GrabadoraFalsa {
      start(): void {
        throw new Error("El micrófono se ha desconectado");
      }
    }
    vi.stubGlobal("MediaRecorder", GrabadoraRota);
    pintar();

    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));

    expect(
      await screen.findByText("No se puede usar el micrófono: El micrófono se ha desconectado"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Silencio")).not.toBeInTheDocument();
    expect(pista.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Grabar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Ensayar/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Parar/ })).toBeDisabled();
    expect(screen.getByLabelText("Lección")).toBeEnabled();

    // La siguiente toma vuelve a abrir el micrófono en vez de reutilizar el flujo roto.
    vi.stubGlobal("MediaRecorder", GrabadoraFalsa);
    await userEvent.click(screen.getByRole("button", { name: /Grabar/ }));
    await screen.findByText("Silencio");
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it("codifica la versión de la toma en la URL del audio", async () => {
    pintar({
      ...datos,
      escenas: datos.escenas.map((e) =>
        e.id === "E03" ? { ...e, version_toma: "1&ruta=otra" as unknown as number } : e,
      ),
    });

    await userEvent.click(screen.getByRole("button", { name: "E03 ✓" }));

    expect(screen.getByTestId("toma").getAttribute("src")).toMatch(/&v=1%26ruta%3Dotra$/);
  });
});

describe("Teleprompter: la zona de entrega mientras se lee", () => {
  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

  it("se oculta sin desmontarse mientras se lee y la línea de lectura no se desplaza", async () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    await avanzar(0);
    const zona = screen.getByRole("region", { name: "Entregar las tomas de cámara" });
    const contenedor = zona.closest("[data-sin-atajos]") as HTMLElement;
    const prompter = screen.getByTestId("prompter");
    // jsdom no maqueta: el texto tiene más alto cuando la zona de entrega no le quita sitio.
    Object.defineProperty(prompter, "clientHeight", {
      configurable: true,
      get: () => (contenedor.hidden ? 700 : 400),
    });
    const desplazamientos: Array<{ top: number; zonaOculta: boolean }> = [];
    Object.defineProperty(prompter, "scrollTo", {
      configurable: true,
      value: (opciones: { top: number }) =>
        desplazamientos.push({ top: opciones.top, zonaOculta: contenedor.hidden }),
    });
    expect(zona).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Empezar/ }));
    // Ya en la cuenta atrás: el texto tiene su alto definitivo antes de empezar a moverse.
    expect(zona).not.toBeVisible();
    await avanzar(2500 + 1500);
    expect(screen.getByRole("status")).toHaveTextContent("En marcha: cuéntalo a tu manera.");

    const lectura = desplazamientos.filter(({ top }) => top !== 0);
    expect(lectura.length).toBeGreaterThan(0);
    expect(lectura.every(({ zonaOculta }) => zonaOculta)).toBe(true);
    expect(new Set(lectura.map(({ top }) => top))).toEqual(new Set([-700 * 0.35]));

    fireEvent.click(screen.getByRole("button", { name: /Parar/ }));
    await avanzar(0);
    expect(screen.getByRole("region", { name: "Entregar las tomas de cámara" })).toBe(zona);
    expect(zona).toBeVisible();
    expect(leerEntregas).toHaveBeenCalledOnce();
  });

  it("encoge entre el texto y el pie con su propio scroll en vez de tapar los controles", async () => {
    pintar();
    fireEvent.click(screen.getByRole("button", { name: "E02 🎥" }));
    await avanzar(0);
    const zona = screen.getByRole("region", { name: "Entregar las tomas de cámara" });
    const contenedor = zona.closest("[data-sin-atajos]") as HTMLElement;
    const escenaCaja = contenedor.parentElement as HTMLElement;
    const prompter = screen.getByTestId("prompter");
    const pie = screen.getByRole("contentinfo");
    const clases = (el: Element) => el.className.split(/\s+/);

    // jsdom no maqueta: se fija la estructura que lo garantiza en el navegador.
    // La zona va en el flujo, debajo del texto, y puede encoger con scroll propio.
    expect(prompter.parentElement).toBe(escenaCaja);
    expect(
      prompter.compareDocumentPosition(contenedor) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(clases(contenedor)).toEqual(expect.arrayContaining(["overflow-y-auto", "max-h-[30dvh]"]));
    // En el teleprompter la zona va compacta: una sola franja, para dejar sitio al texto.
    expect(clases(zona.querySelector("label") as HTMLElement)).toContain("py-2.5");
    expect(clases(contenedor)).not.toContain("shrink-0");
    expect(clases(contenedor).some((c) => /^(md:)?(absolute|fixed|sticky)$/.test(c))).toBe(false);
    expect(clases(contenedor).some((c) => /^(md:)?min-h-/.test(c))).toBe(true);
    // El texto cede su sitio primero (base 0) y nunca empuja a la zona fuera de la caja.
    expect(clases(prompter)).toEqual(expect.arrayContaining(["md:min-h-0", "md:flex-1"]));
    // El margen de arriba se mide con la altura de la propia caja, no con la de la ventana:
    // en pantallas bajas la primera línea no queda fuera de la vista.
    expect(clases(prompter)).toContain("[container-type:size]");
    expect(clases(prompter.firstElementChild as HTMLElement)).toContain("pt-[30cqh]");

    // La caja de la escena encoge a su hueco y recorta su desborde (no pinta encima del pie).
    expect(clases(escenaCaja)).toEqual(
      expect.arrayContaining(["flex", "flex-col", "flex-1", "min-h-0", "md:overflow-y-auto"]),
    );
    // El pie no está dentro de nada que la zona pueda desbordar: es hermano de la caja.
    expect(escenaCaja.contains(pie)).toBe(false);
    expect(pie.parentElement).toBe(escenaCaja.parentElement);
    expect(clases(pie)).toContain("shrink-0");
  });
});
