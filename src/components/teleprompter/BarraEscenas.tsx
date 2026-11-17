import { textoLegible } from "@/lib/texto-legible";
import type { EscenaTeleprompter } from "@/lib/tipos";

export function BarraEscenas({
  escenas,
  indice,
  grabadas,
  alElegir,
  desactivada = false,
}: {
  escenas: EscenaTeleprompter[];
  indice: number;
  grabadas: ReadonlySet<string>;
  alElegir: (indice: number) => void;
  desactivada?: boolean;
}) {
  return (
    <nav
      aria-label="Escenas"
      className="flex flex-wrap gap-1.5 border-b border-borde px-4 py-2.5 md:px-6"
    >
      {escenas.map((escena, i) => {
        const actual = i === indice;
        const hecha = escena.modo === "voz" && grabadas.has(escena.id);

        return (
          <button
            key={escena.id}
            type="button"
            title={textoLegible(escena.titulo)}
            aria-current={actual ? "true" : undefined}
            disabled={desactivada}
            onClick={() => alElegir(i)}
            className={`min-h-9 rounded-lg border px-2.5 py-1.5 font-mono text-[13px] font-bold transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-60 ${
              escena.modo === "voz" ? "text-azul-claro" : "text-ambar"
            } ${actual ? "border-texto bg-superficie" : "border-borde bg-transparent"}`}
          >
            {escena.id}
            {hecha ? (
              <>
                {" "}
                <span className="text-verde">✓</span>
              </>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
