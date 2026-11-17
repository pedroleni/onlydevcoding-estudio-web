import type { ReactNode, Ref } from "react";

const BOTON =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-4 py-2.5 font-semibold transition-colors hover:enabled:border-tenue disabled:cursor-default disabled:opacity-40";
const NORMAL = `${BOTON} border-borde bg-superficie`;

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-current px-[5px] py-px font-mono text-xs opacity-75">
      {children}
    </kbd>
  );
}

export type EventoToma = "play" | "parada";

export function PieControles({
  voz,
  enMarcha,
  guardando,
  pendiente,
  editando,
  vistaCamara,
  alReintentar,
  alEnsayar,
  alGrabar,
  alParar,
  alRepetir,
  alEditar,
  alCambiarVista,
  alEventoToma,
  relojRef,
  estado,
  toma,
}: {
  voz: boolean;
  enMarcha: boolean;
  guardando: boolean;
  pendiente: boolean;
  editando: boolean;
  // Solo en las escenas a cámara: la vista que se está usando.
  vistaCamara: "guion" | "puntos" | null;
  alReintentar: () => void;
  alEnsayar: () => void;
  alGrabar: () => void;
  alParar: () => void;
  alRepetir: () => void;
  alEditar: () => void;
  alCambiarVista: () => void;
  alEventoToma: (audio: HTMLAudioElement, evento: EventoToma) => void;
  relojRef: Ref<HTMLSpanElement>;
  estado: string;
  toma: string | null;
}) {
  return (
    <footer className="flex flex-wrap items-center gap-2.5 border-t border-borde px-4 py-3.5 md:px-6">
      <button
        type="button"
        onClick={alEnsayar}
        disabled={enMarcha || guardando || editando}
        className={`${BOTON} border-marca bg-marca text-white`}
      >
        {voz ? "Ensayar" : "Empezar"} <Tecla>Espacio</Tecla>
      </button>
      <button
        type="button"
        onClick={alGrabar}
        disabled={enMarcha || guardando || editando || !voz}
        className={`${BOTON} border-rojo bg-rojo text-white`}
      >
        ● Grabar <Tecla>Intro</Tecla>
      </button>
      <button type="button" onClick={alParar} disabled={!enMarcha} className={NORMAL}>
        ■ Parar <Tecla>Esc</Tecla>
      </button>
      <button type="button" onClick={alRepetir} disabled={!enMarcha} className={NORMAL}>
        ↺ Repetir <Tecla>R</Tecla>
      </button>
      {vistaCamara ? (
        <button type="button" onClick={alCambiarVista} disabled={editando} className={NORMAL}>
          {vistaCamara === "puntos" ? "Ver guion con ritmo" : "Ver solo puntos"}
        </button>
      ) : null}
      {editando ? null : (
        <button
          type="button"
          onClick={alEditar}
          disabled={enMarcha || guardando}
          className={NORMAL}
        >
          Editar texto
        </button>
      )}
      {voz ? null : (
        <button type="button" disabled title="Llega en la fase 6" className={NORMAL}>
          ⬆ Entregar los vídeos de la cámara
        </button>
      )}
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3 text-sm text-tenue sm:ml-auto sm:w-auto">
        <span ref={relojRef} className="min-w-[6ch] font-mono text-xl text-texto">
          0:00
        </span>
        <span role="status" className="min-w-0">
          {estado}
        </span>
        {pendiente ? (
          <button
            type="button"
            onClick={alReintentar}
            disabled={enMarcha || guardando}
            className={`${BOTON} min-h-9 border-ambar bg-transparent px-3 py-1.5 text-sm text-ambar`}
          >
            Reintentar subida
          </button>
        ) : null}
        {toma ? (
          <audio
            key={toma}
            data-testid="toma"
            controls
            preload="none"
            src={toma}
            onPlay={(evento) => alEventoToma(evento.currentTarget, "play")}
            onPause={(evento) => alEventoToma(evento.currentTarget, "parada")}
            onEnded={(evento) => alEventoToma(evento.currentTarget, "parada")}
            onSeeked={(evento) => alEventoToma(evento.currentTarget, "parada")}
            className="h-[34px] max-w-full"
          />
        ) : null}
      </div>
    </footer>
  );
}
