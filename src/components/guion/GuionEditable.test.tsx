import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuionEditable } from "@/components/guion/GuionEditable";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import type { Escena, EstadoAccion, Teleprompter } from "@/lib/tipos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-teleprompter", () => ({ guardarTextos: vi.fn() }));
vi.mock("@/components/acciones/BotonAccion", () => ({
  BotonAccion: () => <button>Acción ficticia</button>,
}));
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
  {
    id: "E04",
    modo: "camara",
    tipo: "demostracion",
    titulo: "Escena de cámara ficticia",
    textos: ["Otro resumen ficticio."],
    inicio_s: null,
    duracion_s: null,
  },
  {
    id: "E05",
    modo: "animacion",
    tipo: "animacion",
    titulo: "Animación ficticia",
    textos: [],
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
  ganchos: [
    { id: "gancho-1", titulo: "Gancho ficticio", texto: "Texto de gancho ficticio." },
  ],
  escenas: [
    {
      id: "E03",
      modo: "voz",
      titulo: "Escena de voz ficticia",
      cues: [
        { texto: "Primera frase ficticia." },
        { texto: "Segunda frase ficticia.", pausa: 1 },
      ],
      puntos: [],
      grabada: false,
      toma: null,
      version_toma: null,
    },
    {
      id: "E04",
      modo: "camara",
      titulo: "Escena de cámara ficticia",
      cues: [{ texto: "Frase a cámara ficticia." }],
      puntos: ["Primer punto ficticio.", "Segundo punto ficticio."],
      grabada: false,
      toma: null,
      version_toma: null,
    },
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

function pintar(cambios: Partial<Parameters<typeof GuionEditable>[0]> = {}) {
  return render(
    <GuionEditable
      curso="react"
      numero={4}
      escenas={escenas}
      previa={null}
      teleprompter={teleprompter}
      montaje={null}
      acciones={null}
      {...cambios}
    />,
  );
}

beforeEach(() => {
  vi.mocked(guardarTextos).mockResolvedValue({ ok: true, teleprompter });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("GuionEditable", () => {
  it("edita la frase 2 de una escena de voz y refresca tras guardar", async () => {
    pintar();

    const tarjeta = screen.getByRole("heading", { name: "Escena de voz ficticia" }).closest("article");
    await userEvent.click(within(tarjeta!).getByRole("button", { name: "Editar E03" }));
    const frase = screen.getByLabelText("Frase 2");
    await userEvent.clear(frase);
    await userEvent.type(frase, "Frase corregida ficticia.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardarTextos).toHaveBeenCalledWith("react", 4, VERSION, [
      {
        id: "E03",
        cues: ["Primera frase ficticia.", "Frase corregida ficticia."],
      },
    ]);
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText("Frase 2")).not.toBeInTheDocument();
  });

  it("envía todas las frases y puntos de una escena de cámara", async () => {
    pintar();

    const tarjeta = screen.getByRole("heading", { name: "Escena de cámara ficticia" }).closest("article");
    await userEvent.click(within(tarjeta!).getByRole("button", { name: "Editar E04" }));
    await userEvent.type(screen.getByLabelText("Punto 2"), " corregido");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardarTextos).toHaveBeenCalledWith("react", 4, VERSION, [
      {
        id: "E04",
        cues: ["Frase a cámara ficticia."],
        puntos: ["Primer punto ficticio.", "Segundo punto ficticio. corregido"],
      },
    ]);
  });

  it("desactiva Guardar si queda una frase vacía", async () => {
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "Editar E03" }));

    await userEvent.clear(screen.getByLabelText("Frase 2"));

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("con conflicto conserva la frase escrita y ofrece Recargar", async () => {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: false,
      mensaje: "El guion ha cambiado fuera de la app. Recarga antes de guardar.",
      conflicto: true,
    });
    pintar();
    await userEvent.click(screen.getByRole("button", { name: "Editar E03" }));
    const frase = screen.getByLabelText("Frase 2");
    await userEvent.clear(frase);
    await userEvent.type(frase, "Texto que no se pierde.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El guion ha cambiado fuera de la app. Recarga antes de guardar.")).toBeInTheDocument();
    expect(frase).toHaveValue("Texto que no se pierde.");
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
  });

  it("solo permite editar las escenas presentes en el teleprompter", () => {
    pintar();

    expect(screen.getAllByRole("button", { name: /^Editar E\d{2}$/ })).toHaveLength(2);
    const animacion = screen.getByRole("heading", { name: "Animación ficticia" }).closest("article");
    expect(within(animacion!).queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
  });

  it("sin teleprompter no muestra edición ni ganchos", () => {
    pintar({ teleprompter: null });

    expect(screen.queryByRole("button", { name: /^Editar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ganchos de los shorts" })).not.toBeInTheDocument();
  });

  it("protege el texto de E03 desactivando las demás ediciones", async () => {
    pintar();

    const tarjetaE03 = screen.getByRole("heading", { name: "Escena de voz ficticia" }).closest("article");
    await userEvent.click(within(tarjetaE03!).getByRole("button", { name: "Editar E03" }));
    await userEvent.type(screen.getByLabelText("Frase 2"), " con cambios");

    expect(within(tarjetaE03!).queryByRole("button", { name: "Editar E03" })).not.toBeInTheDocument();
    const tarjetaE04 = screen.getByRole("heading", { name: "Escena de cámara ficticia" }).closest("article");
    expect(within(tarjetaE04!).getByRole("button", { name: "Editar E04" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar ganchos" })).toBeDisabled();
    expect(screen.getByLabelText("Frase 2")).toHaveValue("Segunda frase ficticia. con cambios");
  });

  it("el botón Editar se ve corto pero se anuncia con su escena", () => {
    pintar();

    expect(screen.getByRole("button", { name: "Editar E03" })).toHaveTextContent(/^Editar$/);
  });

  it("lleva el foco al primer campo al abrir y lo devuelve a Editar al cancelar", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar E04" }));
    expect(screen.getByLabelText("Frase 1")).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "Editar E04" })).toHaveFocus();
  });

  it("devuelve el foco a Editar tras guardar, también en los ganchos", async () => {
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar ganchos" }));
    const texto = screen.getByLabelText("Texto de Gancho ficticio");
    expect(texto).toHaveFocus();
    await userEvent.type(texto, " nuevo");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("button", { name: "Editar ganchos" })).toHaveFocus();
  });

  it("usa la versión devuelta al guardar sin esperar al refresco", async () => {
    const NUEVA = "c".repeat(64);
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: true,
      teleprompter: {
        ...teleprompter,
        version: NUEVA,
        escenas: [
          { ...teleprompter.escenas[0], cues: [
            { texto: "Primera frase ficticia." },
            { texto: "Frase guardada ficticia.", pausa: 1 },
          ] },
          teleprompter.escenas[1],
        ],
      },
    });
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Editar E03" }));
    const frase = screen.getByLabelText("Frase 2");
    await userEvent.clear(frase);
    await userEvent.type(frase, "Frase guardada ficticia.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Sin refresco todavía: el editor abre con lo guardado, no con el texto anterior.
    await userEvent.click(screen.getByRole("button", { name: "Editar E03" }));
    expect(screen.getByLabelText("Frase 2")).toHaveValue("Frase guardada ficticia.");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await userEvent.click(screen.getByRole("button", { name: "Editar E04" }));
    await userEvent.type(screen.getByLabelText("Punto 1"), " más");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardarTextos).toHaveBeenLastCalledWith("react", 4, NUEVA, [
      expect.objectContaining({ id: "E04" }),
    ]);
  });

  it("desactiva Guardar si arranca un trabajo con el editor abierto", async () => {
    const { rerender } = pintar();
    await userEvent.click(screen.getByRole("button", { name: "Editar E03" }));
    await userEvent.type(screen.getByLabelText("Frase 2"), " con cambios");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();

    const enMarcha: EstadoAccion = {
      id: "preparar-montaje",
      etiqueta: "Preparar el montaje",
      disponible: true,
      motivo: null,
      opciones: [],
      ultimo: {
        id: 70,
        accion: "preparar-montaje",
        curso: "react",
        numero: 4,
        objetivo: null,
        estado: "en_marcha",
        progreso: 0,
        inicio: "2026-11-18T10:00:00Z",
        fin: null,
        error: null,
      },
      ultimos: {},
    };
    rerender(
      <GuionEditable
        curso="react"
        numero={4}
        escenas={escenas}
        previa={null}
        teleprompter={teleprompter}
        montaje={null}
        acciones={[enMarcha]}
      />,
    );

    const guardar = screen.getByRole("button", { name: "Guardar" });
    expect(guardar).toBeDisabled();
    expect(guardar).toHaveAccessibleDescription(
      "Espera a que termine: Preparar el montaje en marcha.",
    );
    expect(screen.getByLabelText("Frase 2")).toHaveValue("Segunda frase ficticia. con cambios");
  });
});
