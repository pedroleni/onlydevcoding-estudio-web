import { mmss, type Plan } from "@/lib/teleprompter/ritmo";
import { textoLegible } from "@/lib/texto-legible";
import type { EscenaTeleprompter } from "@/lib/tipos";

type Props = {
  escena: EscenaTeleprompter;
  plan: Plan | null;
  voz: boolean;
  puntos: boolean;
  ritmo: number;
  apartado: string;
};

function duracionEscena({ escena, plan, voz, puntos, ritmo }: Omit<Props, "apartado">) {
  if (!plan) return "";
  if (voz) return `≈ ${mmss(plan.total)} a ${ritmo} ppm`;
  return `${puntos ? "objetivo " : ""}≈ ${mmss(plan.total)} · se graba con tu cámara: ${escena.id}.mov`;
}

// Tipo de escena, título, duración y, en las de cámara, cómo se graba y si ya está grabada.
export function CabeceraEscena(props: Props) {
  const { escena, voz, apartado } = props;
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 pt-2.5 md:px-12 ${apartado}`}
    >
      <span
        className={`rounded-md px-2.5 py-1 text-[13px] font-extrabold tracking-[0.14em] uppercase ${
          voz ? "bg-marca/15 text-azul-claro" : "bg-ambar/15 text-ambar"
        }`}
      >
        {voz ? "Voz en off · leer" : "Cámara · con tus palabras"}
      </span>
      <h1 className="m-0 text-2xl font-semibold text-balance">
        {`${escena.id} · ${textoLegible(escena.titulo)}`}
      </h1>
      <span className="font-mono text-sm text-tenue">{duracionEscena(props)}</span>
      {voz ? null : (
        <span className="text-sm text-ambar">🎥 Se graba con la cámara · horizontal</span>
      )}
      {!voz && escena.grabada ? (
        <span className="text-sm font-semibold text-verde">✓ Grabada</span>
      ) : null}
    </div>
  );
}
