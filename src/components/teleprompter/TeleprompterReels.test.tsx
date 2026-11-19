import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/acciones-reels", () => ({ marcarGanchoGrabado: vi.fn() }));

import { TeleprompterReels } from "@/components/teleprompter/TeleprompterReels";
import { marcarGanchoGrabado } from "@/lib/acciones-reels";
import type { ReelsCurso } from "@/lib/tipos";

const REELS: ReelsCurso = {
  lecciones: [
    {
      numero: 4,
      titulo: "Importar y exportar",
      ganchos: [
        { id: "S1", titulo: "Un par de llaves", texto: "Un par de llaves, y en blanco.", grabado: true, entregado: false },
        { id: "S2", titulo: "Una mayúscula", texto: "Funciona en tu ordenador.", grabado: false, entregado: false },
      ],
    },
    {
      numero: 5,
      titulo: "JSX",
      ganchos: [
        { id: "S1", titulo: "Un div de más", texto: "Un div de más, y tu lista se rompe.", grabado: false, entregado: false },
      ],
    },
  ],
};

beforeEach(() => {
  vi.mocked(marcarGanchoGrabado).mockReset();
  vi.mocked(marcarGanchoGrabado).mockResolvedValue({ ok: true, reels: REELS });
});

describe("teleprompter de reels", () => {
  it("lista todas las lecciones ocultando lo grabado, con el progreso", async () => {
    const usuario = userEvent.setup();
    render(<TeleprompterReels curso="react" reels={REELS} leccionInicial="todas" />);

    expect(screen.getByText("1 de 3 grabados")).toBeInTheDocument();
    expect(screen.queryByRole("listitem", { name: "S1 · Un par de llaves" })).toBeNull();
    expect(screen.getByRole("listitem", { name: "S2 · Una mayúscula" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Lección 5" })).toBeInTheDocument();

    await usuario.click(screen.getByLabelText("Ocultar los grabados"));
    expect(screen.getByRole("listitem", { name: "S1 · Un par de llaves" })).toBeInTheDocument();
  });

  it("filtra por lección y marca grabado guardándolo en la API", async () => {
    const usuario = userEvent.setup();
    render(<TeleprompterReels curso="react" reels={REELS} leccionInicial="todas" />);

    await usuario.selectOptions(screen.getByLabelText("Lección"), "5");
    expect(screen.queryByRole("region", { name: "Lección 4" })).toBeNull();
    expect(screen.getByText("0 de 1 grabados")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: "Marcar grabado" }));
    expect(marcarGanchoGrabado).toHaveBeenCalledWith("react", 5, "S1", true);
    expect(await screen.findByText("Todo grabado. Pásale los vídeos a Claude para montar los shorts.")).toBeInTheDocument();
  });

  it("lee en grande y avanza al marcar grabado; si falla, lo deshace y avisa", async () => {
    const usuario = userEvent.setup();
    vi.mocked(marcarGanchoGrabado)
      .mockResolvedValueOnce({ ok: true, reels: REELS })
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo guardar el gancho" });
    render(<TeleprompterReels curso="react" reels={REELS} leccionInicial="todas" />);

    const tarjeta = screen.getByRole("listitem", { name: "S2 · Una mayúscula" });
    await usuario.click(within(tarjeta).getByRole("button", { name: "Leer en grande" }));
    const pantalla = screen.getByRole("dialog", { name: "Reel en grande" });
    expect(within(pantalla).getByText("Funciona en tu ordenador.")).toBeInTheDocument();
    expect(within(pantalla).getByText("1/2")).toBeInTheDocument();

    await usuario.click(within(pantalla).getByRole("button", { name: "Grabado ✓" }));
    expect(marcarGanchoGrabado).toHaveBeenLastCalledWith("react", 4, "S2", true);
    expect(within(pantalla).getByText("Un div de más, y tu lista se rompe.")).toBeInTheDocument();

    await usuario.click(within(pantalla).getByRole("button", { name: "Grabado ✓" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el gancho");
    expect(within(pantalla).getByRole("button", { name: "Grabado ✓" })).toBeInTheDocument();

    await usuario.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
