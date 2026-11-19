import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EditorGanchos } from "@/components/guion/EditorGanchos";
import { guardarTextos } from "@/lib/acciones-teleprompter";
import type { Teleprompter } from "@/lib/tipos";

const router = { refresh: vi.fn() };
const VERSION = "a".repeat(64);
const ganchos = [
  { id: "gancho-1", titulo: "Primer gancho", texto: "Primer texto ficticio." },
  { id: "gancho_2", titulo: "Segundo gancho", texto: "Segundo texto ficticio." },
];
const teleprompter = { version: "b".repeat(64) } as Teleprompter;

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/acciones-teleprompter", () => ({ guardarTextos: vi.fn() }));

function pintar(cambios: Partial<Parameters<typeof EditorGanchos>[0]> = {}) {
  const alGuardado = vi.fn();
  const alCancelar = vi.fn();
  const resultado = render(
    <EditorGanchos
      curso="react"
      numero={4}
      version={VERSION}
      ganchos={ganchos}
      alGuardado={alGuardado}
      alCancelar={alCancelar}
      {...cambios}
    />,
  );
  return { ...resultado, alGuardado, alCancelar };
}

beforeEach(() => {
  vi.mocked(guardarTextos).mockResolvedValue({ ok: true, teleprompter });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("EditorGanchos", () => {
  it("edita un gancho y los envía todos sin escenas", async () => {
    const { alGuardado } = pintar();

    await userEvent.clear(screen.getByLabelText("Texto de Primer gancho"));
    await userEvent.type(screen.getByLabelText("Texto de Primer gancho"), "Gancho corregido ficticio.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardarTextos).toHaveBeenCalledWith({
      curso: "react",
      numero: 4,
      version: VERSION,
      escenas: [],
      ganchos: [
        { id: "gancho-1", texto: "Gancho corregido ficticio." },
        { id: "gancho_2", texto: "Segundo texto ficticio." },
      ],
    });
    expect(alGuardado).toHaveBeenCalled();
  });

  it("desactiva Guardar con un texto vacío", async () => {
    pintar();

    await userEvent.clear(screen.getByLabelText("Texto de Primer gancho"));

    expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled();
  });

  it("elimina saltos pegados y avisa al salir si cambia el texto", () => {
    pintar();
    const campo = screen.getByLabelText("Texto de Primer gancho");

    fireEvent.change(campo, { target: { value: "Texto\npegado" } });
    expect(campo).toHaveValue("Texto pegado");
    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
  });

  it("con conflicto conserva lo escrito y ofrece Recargar", async () => {
    vi.mocked(guardarTextos).mockResolvedValueOnce({
      ok: false,
      mensaje: "El guion ha cambiado fuera de la app. Recarga antes de guardar.",
      conflicto: true,
    });
    pintar();
    const campo = screen.getByLabelText("Texto de Primer gancho");
    await userEvent.clear(campo);
    await userEvent.type(campo, "Texto que no se pierde.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByText("El guion ha cambiado fuera de la app. Recarga antes de guardar.")).toBeInTheDocument();
    expect(campo).toHaveValue("Texto que no se pierde.");
    await userEvent.click(screen.getByRole("button", { name: "Recargar" }));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(campo).toHaveValue("Texto que no se pierde.");
  });

  it("renderiza título y texto externo como texto literal", () => {
    const texto = "<script>alert('prueba')</script>";
    pintar({ ganchos: [{ id: "gancho-1", titulo: texto, texto }] });

    expect(screen.getAllByText(texto).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue(texto)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
});
