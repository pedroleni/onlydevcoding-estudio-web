import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuionEditable } from "@/components/guion/GuionEditable";
import { lanzarAccion } from "@/lib/acciones-estudio";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import type {
  Escena,
  EstadoAccion,
  EstadoMontaje,
  IdAccion,
  Teleprompter,
  Trabajo,
} from "@/lib/tipos";
import { leerTrabajo } from "@/lib/trabajos";

// Recorridos del aviso del montaje con el BotonAccion real: lanzar desde el aviso, ver el
// resultado aunque cambie el estado del montaje y no editar mientras se prepara la lección.

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-estudio", () => ({
  lanzarAccion: vi.fn(),
  cancelarTrabajo: vi.fn(),
}));
vi.mock("@/lib/acciones-teleprompter", () => ({ guardarTextos: vi.fn() }));
vi.mock("@/lib/trabajos", () => ({ leerTrabajo: vi.fn() }));

const VERSION = "a".repeat(64);
const escenas: Escena[] = [
  {
    id: "E03",
    modo: "voz",
    tipo: "explicacion",
    titulo: "Escena de voz ficticia",
    textos: ["Texto de resumen ficticio."],
    inicio_s: null,
    duracion_s: null,
  },
];

const teleprompter: Teleprompter = {
  curso: "react",
  numero: 4,
  guion: "react-04",
  titulo: "Lección ficticia",
  version: VERSION,
  ganchos: [{ id: "gancho-1", titulo: "Gancho ficticio", texto: "Texto de gancho ficticio." }],
  escenas: [
    {
      id: "E03",
      modo: "voz",
      titulo: "Escena de voz ficticia",
      cues: [{ texto: "Primera frase ficticia." }],
      puntos: [],
      grabada: true,
      toma: null,
      version_toma: null,
    },
  ],
  montaje: null,
  previa: { ruta: null, existe: false, desactualizada: false, version: null, trabajo: null },
};

function trabajo(cambios: Partial<Trabajo> = {}): Trabajo {
  return {
    id: 50,
    accion: "preparar-montaje",
    curso: "react",
    numero: 4,
    objetivo: null,
    estado: "en_marcha",
    progreso: 0,
    inicio: "2026-11-18T10:00:00Z",
    fin: null,
    error: null,
    ...cambios,
  };
}

const ETIQUETAS: Record<string, string> = {
  "alinear-voz": "Alinear la voz",
  "preparar-montaje": "Preparar el montaje",
  "preparar-shorts": "Preparar los shorts",
};

function acciones(ultimos: Partial<Record<IdAccion, Trabajo | null>> = {}): EstadoAccion[] {
  return (["alinear-voz", "preparar-montaje", "preparar-shorts"] as const).map((id) => ({
    id,
    etiqueta: ETIQUETAS[id],
    disponible: true,
    motivo: null,
    opciones: [],
    ultimo: ultimos[id] ?? null,
    ultimos: {},
  }));
}

function montaje(estado: EstadoMontaje["estado"], sinAlinear: string[] = []): EstadoMontaje {
  return { estado, sin_alinear: sinAlinear };
}

function guion(props: { montaje: EstadoMontaje; acciones: EstadoAccion[] }) {
  return (
    <GuionEditable
      curso="react"
      numero={4}
      escenas={escenas}
      previa={null}
      teleprompter={teleprompter}
      {...props}
    />
  );
}

function aviso() {
  return screen.getByRole("complementary", { name: "Estado del montaje" });
}

const avanzar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("GuionEditable: aviso del montaje", () => {
  it("tras preparar el montaje desde el aviso enseña «Montaje al día.» con Hecho", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    const hecho = trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:28Z" });
    vi.mocked(leerTrabajo).mockResolvedValue(hecho);
    const { rerender } = render(
      guion({ montaje: montaje("guion_cambiado"), acciones: acciones() }),
    );

    fireEvent.click(within(aviso()).getByRole("button", { name: "Preparar el montaje" }));
    await avanzar(0);
    expect(within(aviso()).getByText("En marcha…")).toBeInTheDocument();

    await avanzar(2000);
    expect(router.refresh).toHaveBeenCalledOnce();

    rerender(guion({
      montaje: montaje("al_dia"),
      acciones: acciones({ "preparar-montaje": { ...hecho } }),
    }));

    expect(within(aviso()).getByText("Montaje al día.")).toBeInTheDocument();
    expect(within(aviso()).getByText("Hecho")).toBeInTheDocument();
    expect(within(aviso()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("al pasar de alinear la voz a preparar el montaje no arrastra estado ni enseña un Hecho antiguo", async () => {
    const antiguo = trabajo({ id: 10, estado: "hecho", progreso: 1, fin: "2026-11-17T10:00:00Z" });
    const alineado = trabajo({
      id: 51,
      accion: "alinear-voz",
      estado: "hecho",
      progreso: 1,
      fin: "2026-11-18T10:00:30Z",
    });
    vi.mocked(lanzarAccion).mockResolvedValueOnce({
      ok: false,
      mensaje: "Ya hay un trabajo en marcha",
    });
    const { rerender } = render(guion({
      montaje: montaje("voz_sin_alinear", ["E03"]),
      acciones: acciones({ "preparar-montaje": antiguo }),
    }));

    fireEvent.click(within(aviso()).getByRole("button", { name: "Alinear la voz" }));
    await avanzar(0);
    expect(within(aviso()).getByRole("alert")).toHaveTextContent("Ya hay un trabajo en marcha");

    vi.mocked(lanzarAccion).mockResolvedValueOnce({
      ok: true,
      trabajo: trabajo({ id: 51, accion: "alinear-voz" }),
    });
    vi.mocked(leerTrabajo).mockResolvedValue(alineado);
    fireEvent.click(within(aviso()).getByRole("button", { name: "Alinear la voz" }));
    await avanzar(0);
    await avanzar(2000);
    expect(within(aviso()).getByText("Hecho")).toBeInTheDocument();

    rerender(guion({
      montaje: montaje("guion_cambiado"),
      acciones: acciones({ "alinear-voz": { ...alineado }, "preparar-montaje": { ...antiguo } }),
    }));

    expect(within(aviso()).getByText("Guion cambiado: hay que regenerar el montaje.")).toBeInTheDocument();
    expect(within(aviso()).getByRole("button", { name: "Preparar el montaje" })).toBeEnabled();
    expect(within(aviso()).queryByText("Hecho")).not.toBeInTheDocument();
    expect(within(aviso()).getByText("Alinear la voz: Hecho")).toBeInTheDocument();
    expect(within(aviso()).queryByRole("alert")).not.toBeInTheDocument();
  });

  it("un refresco a mitad no deja de seguir el trabajo ni quita Cancelar", async () => {
    const enMarcha = trabajo({ id: 52, accion: "alinear-voz", progreso: 0.3 });
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: enMarcha });
    vi.mocked(leerTrabajo).mockResolvedValue(enMarcha);
    const { rerender } = render(guion({
      montaje: montaje("voz_sin_alinear", ["E03"]),
      acciones: acciones(),
    }));

    fireEvent.click(within(aviso()).getByRole("button", { name: "Alinear la voz" }));
    await avanzar(0);

    // Ya están escritas todas las alineaciones: el estado cambia aunque el trabajo siga.
    rerender(guion({
      montaje: montaje("guion_cambiado"),
      acciones: acciones({ "alinear-voz": { ...enMarcha } }),
    }));

    expect(within(aviso()).getByText("En marcha… 30 %")).toBeInTheDocument();
    expect(within(aviso()).getByRole("button", { name: "Cancelar el trabajo" })).toBeEnabled();
    expect(within(aviso()).queryByRole("button", { name: "Preparar el montaje" })).not.toBeInTheDocument();

    await avanzar(2000);
    expect(leerTrabajo).toHaveBeenCalledWith(52);
  });

  it("sin nada lanzado y con el montaje al día no enseña el aviso", () => {
    render(guion({
      montaje: montaje("al_dia"),
      acciones: acciones({
        "preparar-montaje": trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-17T10:00:00Z" }),
      }),
    }));

    expect(screen.queryByRole("complementary", { name: "Estado del montaje" })).not.toBeInTheDocument();
  });
});

describe("GuionEditable: edición mientras se prepara la lección", () => {
  it("desactiva Editar mientras corre lo lanzado desde el aviso y lo reactiva al acabar", async () => {
    vi.mocked(lanzarAccion).mockResolvedValue({ ok: true, trabajo: trabajo() });
    vi.mocked(leerTrabajo).mockResolvedValue(
      trabajo({ estado: "hecho", progreso: 1, fin: "2026-11-18T10:01:28Z" }),
    );
    render(guion({ montaje: montaje("guion_cambiado"), acciones: acciones() }));
    expect(screen.getByRole("button", { name: "Editar E03" })).toBeEnabled();

    fireEvent.click(within(aviso()).getByRole("button", { name: "Preparar el montaje" }));
    await avanzar(0);

    const editar = screen.getByRole("button", { name: "Editar E03" });
    expect(editar).toBeDisabled();
    expect(editar).toHaveAccessibleDescription(
      "Espera a que termine: Preparar el montaje en marcha.",
    );
    expect(screen.getByRole("button", { name: "Editar ganchos" })).toBeDisabled();

    await avanzar(2000);
    expect(screen.getByRole("button", { name: "Editar E03" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Editar ganchos" })).toBeEnabled();
  });

  it("sigue preparar-shorts en marcha aunque no tenga botón en esta pestaña", async () => {
    const shorts = trabajo({ id: 60, accion: "preparar-shorts" });
    vi.mocked(leerTrabajo).mockResolvedValue({
      ...shorts,
      estado: "hecho",
      progreso: 1,
      fin: "2026-11-18T10:02:00Z",
    });
    render(guion({
      montaje: montaje("al_dia"),
      acciones: acciones({ "preparar-shorts": shorts }),
    }));

    expect(screen.getByRole("button", { name: "Editar ganchos" })).toHaveAccessibleDescription(
      "Espera a que termine: Preparar los shorts en marcha.",
    );

    await avanzar(2000);
    expect(leerTrabajo).toHaveBeenCalledWith(60);
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("no deja editar mientras se identifican las tomas (la API lo bloquea)", () => {
    const identificar = trabajo({ id: 70, accion: "identificar-tomas" });
    vi.mocked(leerTrabajo).mockReturnValue(new Promise(() => undefined));
    render(guion({
      montaje: montaje("al_dia"),
      acciones: [
        ...acciones(),
        {
          id: "identificar-tomas",
          etiqueta: "Identificar las tomas",
          disponible: true,
          motivo: null,
          opciones: [],
          ultimo: identificar,
          ultimos: {},
        },
      ],
    }));

    const editar = screen.getByRole("button", { name: "Editar E03" });
    expect(editar).toBeDisabled();
    expect(editar).toHaveAccessibleDescription(
      "Espera a que termine: Identificar las tomas en marcha.",
    );
    expect(screen.getByRole("button", { name: "Editar ganchos" })).toBeDisabled();
  });

  it("muestra el 409 de la lección ocupada como un error normal", async () => {
    vi.useRealTimers();
    vi.mocked(guardarTextos).mockResolvedValue({
      ok: false,
      mensaje:
        "No se puede cambiar mientras se prepara esta lección. Espera a que termine el trabajo.",
    });
    render(guion({ montaje: montaje("al_dia"), acciones: acciones() }));

    fireEvent.click(screen.getByRole("button", { name: "Editar E03" }));
    fireEvent.change(screen.getByLabelText("Frase 1"), { target: { value: "Frase nueva ficticia." } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No se pudo guardar: No se puede cambiar mientras se prepara esta lección. Espera a que termine el trabajo.",
    );
    expect(screen.queryByRole("button", { name: "Recargar" })).not.toBeInTheDocument();
  });
});
