import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorTextos } from "@/components/teleprompter/EditorTextos";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import type { EscenaTeleprompter, Teleprompter } from "@/lib/tipos";

const router = { refresh: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/lib/acciones-teleprompter", () => ({
  guardarTextos: vi.fn(),
  generarPreviaGrabacion: vi.fn(),
}));

const VERSION = "a".repeat(64);

const voz: EscenaTeleprompter = {
  id: "E03",
  modo: "voz",
  titulo: "Escena ficticia",
  cues: [
    { texto: "Primera frase inventada." },
    { texto: "Segunda frase inventada.", pausa: 2 },
    { texto: "Tercera frase inventada." },
  ],
  puntos: ["Un punto inventado"],
  grabada: false,
  toma: null,
  version_toma: null,
};

const camara: EscenaTeleprompter = {
  ...voz,
  id: "E02",
  modo: "camara",
  puntos: ["Primer punto inventado", "Segundo punto inventado"],
};

const devuelto = { version: "b".repeat(64) } as Teleprompter;

function pintar(escena = voz, cambios: Partial<Parameters<typeof EditorTextos>[0]> = {}) {
  const alGuardado = vi.fn();
  const alCancelar = vi.fn();
  render(
    <EditorTextos
      curso="react"
      numero={4}
      version={VERSION}
      escena={escena}
      alGuardado={alGuardado}
      alCancelar={alCancelar}
      {...cambios}
    />,
  );
  return { alGuardado, alCancelar };
}

beforeEach(() => {
  vi.mocked(guardarTextos).mockResolvedValue({ ok: true, teleprompter: devuelto });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("EditorTextos", () => {
  it("pasa cada frase a un campo de una línea", () => {
    pintar();

    const campos = screen.getAllByRole("textbox");
    expect(campos).toHaveLength(3);
    expect(campos[0]).toHaveValue("Primera frase inventada.");
    expect(campos[0].tagName).toBe("TEXTAREA");
    expect(campos[0]).toHaveAttribute("rows", "1");
    expect(screen.getByLabelText("Frase 2")).toHaveValue("Segunda frase inventada.");
  });

  it("cambiar la frase 1 y guardar envía todas las frases de la escena con la versión cargada", async () => {
    const { alGuardado } = pintar();

    const frase = screen.getByLabelText("Frase 1");
    await userEvent.clear(frase);
    await userEvent.type(frase, "  Frase   corregida a mano.  ");
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(guardarTextos).toHaveBeenCalledWith("react", 4, VERSION, [
      {
        id: "E03",
        cues: [
          "Frase corregida a mano.",
          "Segunda frase inventada.",
          "Tercera frase inventada.",
        ],
      },
    ]);
    expect(alGuardado).toHaveBeenCalledWith(devuelto);
    // El teleprompter refresca él solo con el guion devuelto: aquí no se recarga la página.
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("no deja saltos de línea: Intro no parte la frase", async () => {
    pintar();

    const frase = screen.getByLabelText("Frase 1");
    await userEvent.type(frase, "{Enter}más");
    expect(frase).toHaveValue("Primera frase inventada.más");

    fireEvent.change(frase, { target: { value: "Pegado\ncon\r\nsaltos" } });
    expect(frase).toHaveValue("Pegado con saltos");
  });

  it("en una escena a cámara edita los puntos", async () => {
    pintar(camara);

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    const punto = screen.getByLabelText("Punto 2");
    await userEvent.type(punto, " corregido");
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(guardarTextos).toHaveBeenCalledWith("react", 4, VERSION, [
      { id: "E02", puntos: ["Primer punto inventado", "Segundo punto inventado corregido"] },
    ]);
  });

  it("guarda con la versión con la que se empezó a editar aunque llegue otra", async () => {
    const alGuardado = vi.fn();
    const props = {
      curso: "react",
      numero: 4,
      escena: voz,
      alGuardado,
      alCancelar: vi.fn(),
    };
    const { rerender } = render(<EditorTextos {...props} version={VERSION} />);
    rerender(<EditorTextos {...props} version={"c".repeat(64)} />);

    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(vi.mocked(guardarTextos).mock.calls[0][2]).toBe(VERSION);
  });

  async function enConflicto() {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: false,
      mensaje: "El guion ha cambiado fuera de la app. Recarga antes de guardar.",
      conflicto: true,
    });
    const alGuardado = vi.fn();
    const alCancelar = vi.fn();
    const props = { curso: "react", numero: 4, escena: voz, alGuardado, alCancelar };
    const resultado = render(<EditorTextos {...props} version={VERSION} />);

    const frase = screen.getByLabelText("Frase 1");
    await userEvent.clear(frase);
    await userEvent.type(frase, "Texto que no se pierde.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    await screen.findByText("El guion ha cambiado fuera de la app. Recarga antes de guardar.");
    return { ...resultado, props, alGuardado, alCancelar };
  }

  it("con un conflicto muestra el mensaje, conserva lo escrito y ofrece Recargar", async () => {
    const { alGuardado } = await enConflicto();

    expect(screen.getByLabelText("Frase 1")).toHaveValue("Texto que no se pierde.");
    expect(screen.getByRole("button", { name: "Recargar" })).toBeInTheDocument();
    expect(alGuardado).not.toHaveBeenCalled();
  });

  it("Recargar pide el guion nuevo sin cerrar el editor y no deja guardar con la versión vieja", async () => {
    const { alCancelar } = await enConflicto();

    await userEvent.click(screen.getByRole("button", { name: "Recargar" }));

    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(alCancelar).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Frase 1")).toHaveValue("Texto que no se pierde.");
    expect(screen.getByRole("button", { name: "Guardar texto" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(guardarTextos).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Cargando el guion nuevo…");
  });

  it("al llegar el guion nuevo pregunta: descartar lo escrito cierra el editor", async () => {
    const { rerender, props, alCancelar } = await enConflicto();
    await userEvent.click(screen.getByRole("button", { name: "Recargar" }));

    rerender(<EditorTextos {...props} version={"d".repeat(64)} />);

    expect(screen.getByText("Ha llegado el guion nuevo. ¿Descartas lo que has escrito?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Descartar lo escrito" }));
    expect(alCancelar).toHaveBeenCalled();
  });

  it("mientras espera y pregunta, lo escrito sigue a la vista, seleccionable y sin poder seguir con ello", async () => {
    const { rerender, props } = await enConflicto();
    await userEvent.click(screen.getByRole("button", { name: "Recargar" }));

    const frase = screen.getByLabelText("Frase 1") as HTMLTextAreaElement;
    expect(frase).toHaveValue("Texto que no se pierde.");
    expect(frase).toBeEnabled();
    expect(frase).toHaveAttribute("readonly");
    frase.select();
    expect(frase.selectionEnd - frase.selectionStart).toBe("Texto que no se pierde.".length);

    rerender(<EditorTextos {...props} version={"d".repeat(64)} />);

    expect(screen.getByLabelText("Frase 1")).toHaveValue("Texto que no se pierde.");
    expect(screen.getByLabelText("Frase 1")).toBeEnabled();
    expect(screen.getByRole("button", { name: "Descartar lo escrito" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seguir con lo mío" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar texto" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(guardarTextos).toHaveBeenCalledTimes(1);
  });

  it("con texto sin guardar, salir de la página avisa", async () => {
    pintar();
    const salir = () => {
      const evento = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(evento);
      return evento.defaultPrevented;
    };

    expect(salir()).toBe(false);
    await userEvent.type(screen.getByLabelText("Frase 2"), " cambiada");
    expect(salir()).toBe(true);
  });

  it("otros errores se dicen sin Recargar", async () => {
    vi.mocked(guardarTextos).mockResolvedValue({
      ok: false,
      mensaje: "No se puede conectar con la API",
    });
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(
      await screen.findByText("No se pudo guardar: No se puede conectar con la API"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recargar" })).not.toBeInTheDocument();
  });

  it("no envía un texto vacío ni uno de más de 1000 caracteres", async () => {
    pintar();

    await userEvent.clear(screen.getByLabelText("Frase 2"));
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada texto tiene que tener entre 1 y 1000 caracteres.",
    );

    fireEvent.change(screen.getByLabelText("Frase 2"), { target: { value: "x".repeat(1001) } });
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(guardarTextos).not.toHaveBeenCalled();
  });

  it("no envía un texto formado solo por espacios", async () => {
    pintar();

    fireEvent.change(screen.getByLabelText("Frase 2"), { target: { value: "     " } });
    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cada texto tiene que tener entre 1 y 1000 caracteres.",
    );
    expect(guardarTextos).not.toHaveBeenCalled();
  });

  it("mientras guarda no deja guardar otra vez", async () => {
    let resolver!: (valor: Awaited<ReturnType<typeof guardarTextos>>) => void;
    vi.mocked(guardarTextos).mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    pintar();

    await userEvent.click(screen.getByRole("button", { name: "Guardar texto" }));
    expect(screen.getByRole("button", { name: "Guardar texto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();

    await act(async () => resolver({ ok: true, teleprompter: devuelto }));
  });

  it("Cancelar sale sin guardar", async () => {
    const { alCancelar } = pintar();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(alCancelar).toHaveBeenCalled();
    expect(guardarTextos).not.toHaveBeenCalled();
  });
});
