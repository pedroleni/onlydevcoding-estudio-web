import { BotonCopiar } from "@/components/publicar/BotonCopiar";
import { Contador } from "@/components/publicar/Contador";
import { ElegirPortada } from "@/components/publicar/ElegirPortada";
import { PestanasRed } from "@/components/publicar/PestanasRed";
import { SelectorPieza } from "@/components/publicar/SelectorPieza";
import { LIMITES_PUBLICACION } from "@/lib/limites";
import { esVideoLinkedin, redesDisponibles } from "@/lib/redes-publicacion";
import type { PiezaVista, RedVista, VistaPublicacion } from "@/lib/tipos";

function Avisos({ error, aviso }: Pick<VistaPublicacion, "error" | "aviso">) {
  return (
    <>
      {error ? (
        <div role="alert" className="border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          {error}
        </div>
      ) : null}
      {aviso ? (
        <div role="status" className="border border-amber-500/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          {aviso}
        </div>
      ) : null}
    </>
  );
}

function PanelRed({
  vista,
  pieza,
  red,
  avisoSinTextos,
}: {
  vista: VistaPublicacion;
  pieza: PiezaVista;
  red: RedVista | null;
  avisoSinTextos: boolean;
}) {
  if (red) {
    return (
      <PestanasRed
        key={`${pieza.id}-${esVideoLinkedin(pieza, red.red) ? "linkedin" : "redes"}`}
        curso={vista.curso}
        numero={vista.numero}
        pieza={pieza}
        redInicial={red.red}
        // En la lección, el vídeo para LinkedIn va en su propia tarjeta.
        soloVideoLinkedin={
          pieza.tipo === "leccion" ? esVideoLinkedin(pieza, red.red) : undefined
        }
      />
    );
  }
  if (avisoSinTextos) return null;
  return (
    <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
      Esta pieza no tiene redes de publicación.
    </p>
  );
}

function ContenidoPieza({
  vista,
  pieza,
  red,
  avisoSinTextos,
}: {
  vista: VistaPublicacion;
  pieza: PiezaVista | null;
  red: RedVista | null;
  avisoSinTextos: boolean;
}) {
  if (vista.piezas.length === 0 || pieza === null) {
    return (
      <div className="border border-borde bg-superficie p-6">
        <h2 className="text-xl font-semibold">Publicar</h2>
        <p className="mt-2 text-sm text-tenue">
          Esta lección todavía no tiene piezas para publicar.
        </p>
      </div>
    );
  }

  return (
    <>
      <SelectorPieza piezas={vista.piezas} activa={pieza.id} red={red?.red ?? null} />
      <ElegirPortada
        key={`portadas-${pieza.id}`}
        curso={vista.curso}
        numero={vista.numero}
        pieza={pieza}
      />
      {avisoSinTextos ? (
        <p className="border border-borde bg-superficie p-5 text-sm text-tenue">
          Esta lección todavía no tiene textos de publicación
        </p>
      ) : null}
      <PanelRed vista={vista} pieza={pieza} red={red} avisoSinTextos={avisoSinTextos} />
    </>
  );
}

function NotasPublicacion({ notas }: { notas: string | null }) {
  if (notas === null) return null;
  return (
    <section aria-labelledby="notas-publicacion-titulo" className="border border-borde bg-superficie">
      <div className="flex items-center justify-between gap-4 border-b border-borde px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 id="notas-publicacion-titulo" className="text-sm font-semibold">Notas generales</h2>
          <Contador valor={notas} limite={LIMITES_PUBLICACION.notas} />
        </div>
        <BotonCopiar texto={notas} contexto="las notas generales" />
      </div>
      <p className="whitespace-pre-wrap break-words p-4 text-sm leading-6 text-tenue">{notas}</p>
    </section>
  );
}

function TareasPosteriores({ tareas }: { tareas: string[] }) {
  if (tareas.length === 0) return null;
  return (
    <section aria-labelledby="despues-publicar-titulo">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="despues-publicar-titulo" className="text-xl font-semibold">Después de publicar</h2>
        <Contador valor={tareas.length} limite={LIMITES_PUBLICACION.maximoLineas} unidad="tareas" />
      </div>
      <ol className="mt-4 grid gap-2">
        {tareas.map((tarea, indice) => (
          <li key={`${indice}-${tarea}`} className="flex gap-3 border border-borde bg-superficie p-4 text-sm">
            <span className="font-mono text-marca">{String(indice + 1).padStart(2, "0")}</span>
            <span className="min-w-0 flex-1 break-words">{tarea}</span>
            <Contador valor={tarea} limite={LIMITES_PUBLICACION.caracteresPorLinea} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PublicarLeccion({
  vista,
  piezaSeleccionada,
  redSeleccionada,
}: {
  vista: VistaPublicacion;
  piezaSeleccionada?: string;
  redSeleccionada?: string;
}) {
  const pieza = vista.piezas.find(({ id }) => id === piezaSeleccionada) ?? vista.piezas[0] ?? null;
  const disponibles = pieza ? redesDisponibles(pieza) : [];
  // Un ?red= que apunta a una red sin textos ni estado cae en la primera disponible.
  const red = disponibles.find(({ red: id }) => id === redSeleccionada) ?? disponibles[0] ?? null;
  const sinTextos = vista.piezas.every((elemento) =>
    elemento.redes.every(({ textos }) => textos === null),
  );
  const avisoSinTextos = sinTextos && !vista.error;

  return (
    <div role="tabpanel" className="grid min-w-0 gap-8">
      <Avisos error={vista.error} aviso={vista.aviso} />
      <ContenidoPieza vista={vista} pieza={pieza} red={red} avisoSinTextos={avisoSinTextos} />
      <NotasPublicacion notas={vista.notas} />
      <TareasPosteriores tareas={vista.despues_de_publicar} />
    </div>
  );
}
