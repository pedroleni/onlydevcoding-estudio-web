import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GuionEditable } from "@/components/guion/GuionEditable";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import type { Escena, Teleprompter } from "@/lib/tipos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-teleprompter", () => ({ guardarTextos: vi.fn() }));
vi.mock("@/components/acciones/BotonAccion", () => ({
  BotonAccion: () => <button>Acción ficticia</button>,
}));

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
    await userEvent.click(within(tarjeta!).getByRole("button", { name: "Editar" }));
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
    await userEvent.click(within(tarjeta!).getByRole("button", { name: "Editar" }));
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
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);

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
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[0]);
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

    expect(screen.getAllByRole("button", { name: "Editar" })).toHaveLength(2);
    const animacion = screen.getByRole("heading", { name: "Animación ficticia" }).closest("article");
    expect(within(animacion!).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("sin teleprompter no muestra edición ni ganchos", () => {
    pintar({ teleprompter: null });

    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ganchos de los shorts" })).not.toBeInTheDocument();
  });

  it("solo mantiene una escena en edición", async () => {
    pintar();

    const botones = screen.getAllByRole("button", { name: "Editar" });
    await userEvent.click(botones[0]);
    expect(screen.getByLabelText("Frase 2")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Editar" })[1]);
    expect(screen.queryByLabelText("Frase 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Punto 2")).toBeInTheDocument();
  });
});
