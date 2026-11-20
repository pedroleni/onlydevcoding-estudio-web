import type { CSSProperties, RefObject } from "react";

import { EntregaTomas } from "@/components/entregas/EntregaTomas";
import { CabeceraEscena } from "@/components/teleprompter/CabeceraEscena";
import { EditorTextos } from "@/components/teleprompter/EditorTextos";
import { Mensaje } from "@/components/teleprompter/Mensaje";
import { PanelPrevia } from "@/components/teleprompter/PanelPrevia";
import { TextoConRitmo } from "@/components/teleprompter/TextoConRitmo";
import type { SeguimientoPrevia } from "@/components/teleprompter/useSeguimientoPrevia";
import type { Preferencias } from "@/lib/teleprompter/preferencias";
import type { Plan } from "@/lib/teleprompter/ritmo";
import type {
  EscenaTeleprompter,
  EstadoAccion,
  Teleprompter as DatosTeleprompter,
} from "@/lib/tipos";

// El texto que se lee: el editor mientras se corrige, los puntos o el texto al ritmo.
function ContenidoPrompter({
  escena,
  guion,
  editando,
  puntos,
  alGuardarTexto,
  alCancelarEdicion,
}: {
  escena: EscenaTeleprompter;
  guion: DatosTeleprompter;
  editando: boolean;
  puntos: boolean;
  alGuardarTexto: (nuevo: DatosTeleprompter) => void;
  alCancelarEdicion: () => void;
}) {
  if (editando) {
    return (
      <div className="pt-4 pb-[40vh]">
        <EditorTextos
          key={escena.id}
          curso={guion.curso}
          numero={guion.numero}
          version={guion.version}
          escena={escena}
          alGuardado={alGuardarTexto}
          alCancelar={alCancelarEdicion}
        />
      </div>
    );
  }
  if (puntos) {
    return (
      // Los puntos se leen de un vistazo: arriba, sin desplazarse.
      <div className="pt-[5vh] pb-[20vh]">
        <ul className="mx-auto max-w-[34ch] list-disc pl-[1.2em] text-[calc(var(--letra)*0.8)] leading-[1.4] font-semibold">
          {escena.puntos.map((punto, i) => (
            <li key={i} className="mb-[0.7em]">
              {punto}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    // Márgenes en cqh (altura de esta caja): la lectura deja la palabra al 35 % de la
    // caja, y con vh la primera línea se salía de la vista en pantallas bajas.
    <div className="pt-[30cqh] pb-[60cqh]">
      <TextoConRitmo key={escena.id} cues={escena.cues} />
    </div>
  );
}

export function ZonaEscena({
  escena,
  plan,
  voz,
  puntos,
  editando,
  enMarcha,
  hayCamara,
  pref,
  guion,
  seguimiento,
  acciones,
  prompterRef,
  videoRef,
  alCargarVideo,
  alGuardarTexto,
  alCancelarEdicion,
  alCambiarSubiendo,
}: {
  escena: EscenaTeleprompter | undefined;
  plan: Plan | null;
  voz: boolean;
  puntos: boolean;
  editando: boolean;
  enMarcha: boolean;
  hayCamara: boolean;
  pref: Preferencias;
  guion: DatosTeleprompter;
  seguimiento: SeguimientoPrevia;
  acciones: EstadoAccion[] | null;
  prompterRef: RefObject<HTMLDivElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  alCargarVideo: () => void;
  alGuardarTexto: (nuevo: DatosTeleprompter) => void;
  alCancelarEdicion: () => void;
  alCambiarSubiendo: (subiendo: boolean) => void;
}) {
  if (!escena) {
    return (
      <div className="flex-1 p-6">
        <Mensaje>Esta lección no tiene escenas de voz ni de cámara.</Mensaje>
      </div>
    );
  }
  const conPrevia = pref.tamPrevia > 0;
  // El texto se aparta a la izquierda del panel (solo en pantallas anchas, donde flota).
  const apartado = conPrevia ? "md:pr-[calc(var(--ancho-previa)+72px)]" : "";

  return (
    // Encoge a su hueco y desplaza (md) lo que no quepa: así nada se pinta encima del pie,
    // que va fuera de esta caja.
    <div
      style={{ "--ancho-previa": `${pref.tamPrevia}px` } as CSSProperties}
      className="relative flex min-h-0 flex-1 flex-col md:overflow-y-auto"
    >
      <CabeceraEscena
        escena={escena}
        plan={plan}
        voz={voz}
        puntos={puntos}
        ritmo={pref.ritmo}
        apartado={apartado}
      />
      {!voz && !puntos && !editando && escena.puntos.length > 0 ? (
        <ul
          className={`mx-4 mt-2 list-disc rounded-xl border border-borde bg-superficie py-2 pr-[18px] pl-[34px] text-[15px] leading-[1.4] text-ambar md:mx-12 ${
            conPrevia ? "md:mr-[calc(var(--ancho-previa)+72px)]" : ""
          }`}
        >
          {escena.puntos.map((punto, i) => (
            <li key={i} className="[&+li]:mt-0.5">
              {punto}
            </li>
          ))}
        </ul>
      ) : null}
      {conPrevia ? (
        <PanelPrevia
          previa={guion.previa}
          seguimiento={seguimiento}
          montaje={guion.montaje}
          escena={escena.id}
          videoRef={videoRef}
          alCargarVideo={alCargarVideo}
        />
      ) : null}
      <div
        ref={prompterRef}
        data-testid="prompter"
        data-con-previa={conPrevia ? "" : undefined}
        style={{ "--letra": `${pref.letra}px` } as CSSProperties}
        className={`relative h-[60dvh] overflow-y-auto scroll-smooth px-4 [container-type:size] motion-reduce:scroll-auto md:h-auto md:min-h-0 md:flex-1 md:px-12 ${apartado}`}
      >
        {/* El margen va dentro: en el propio contenedor impediría que encogiera a su hueco. */}
        <ContenidoPrompter
          escena={escena}
          guion={guion}
          editando={editando}
          puntos={puntos}
          alGuardarTexto={alGuardarTexto}
          alCancelarEdicion={alCancelarEdicion}
        />
      </div>
      {hayCamara ? (
        // Montada para toda la lección y solo oculta en las escenas de voz y mientras se lee
        // (desde la cuenta atrás, para que el texto tenga ya su alto al empezar a moverse):
        // ocultarla no corta una subida en curso. Ocupa solo el hueco que queda entre el texto
        // y el pie, con su propio scroll: puede encoger (no lleva shrink-0) hasta un mínimo
        // usable, y si ni eso cabe desplaza la caja de la escena en vez de tapar el pie.
        <div
          hidden={voz || enMarcha}
          data-sin-atajos=""
          className={`max-h-[30dvh] min-h-14 overflow-y-auto border-t border-borde px-4 py-2 md:px-12 ${apartado}`}
        >
          <EntregaTomas
            curso={guion.curso}
            numero={guion.numero}
            escena={voz ? undefined : escena.id}
            acciones={acciones}
            compacta
            alCambiarSubiendo={alCambiarSubiendo}
          />
        </div>
      ) : null}
    </div>
  );
}
