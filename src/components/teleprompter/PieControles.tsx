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

export function PieControles({
  voz,
  enMarcha,
  alEnsayar,
  alGrabar,
  alParar,
  alRepetir,
  relojRef,
  estado,
  toma,
}: {
  voz: boolean;
  enMarcha: boolean;
  alEnsayar: () => void;
  alGrabar: () => void;
  alParar: () => void;
  alRepetir: () => void;
  relojRef: Ref<HTMLSpanElement>;
  estado: string;
  toma: string | null;
}) {
  return (
    <footer className="flex flex-wrap items-center gap-2.5 border-t border-borde px-4 py-3.5 md:px-6">
      <button
        type="button"
        onClick={alEnsayar}
        disabled={enMarcha}
        className={`${BOTON} border-marca bg-marca text-white`}
      >
        {voz ? "Ensayar" : "Empezar"} <Tecla>Espacio</Tecla>
      </button>
      <button
        type="button"
        onClick={alGrabar}
        disabled={enMarcha || !voz}
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
      <button type="button" disabled title="Llega con la siguiente tarea" className={NORMAL}>
        Editar texto
      </button>
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3 text-sm text-tenue sm:ml-auto sm:w-auto">
        <span ref={relojRef} className="min-w-[6ch] font-mono text-xl text-texto">
          0:00
        </span>
        <span role="status" className="min-w-0">
          {estado}
        </span>
        {toma ? (
          <audio
            key={toma}
            data-testid="toma"
            controls
            preload="none"
            src={toma}
            className="h-[34px] max-w-full"
          />
        ) : null}
      </div>
    </footer>
  );
}
