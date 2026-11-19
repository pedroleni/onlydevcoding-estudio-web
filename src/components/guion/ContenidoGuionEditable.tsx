import { TarjetaEscena } from "@/components/TarjetaEscena";
import { EditorEscenaGuion } from "@/components/guion/EditorEscenaGuion";
import { EditorGanchos } from "@/components/guion/EditorGanchos";
import type { Escena, Teleprompter } from "@/lib/tipos";

export type EdicionGuion = { tipo: "escena"; id: string } | { tipo: "ganchos" } | null;

const BOTON_EDITAR =
  "min-h-10 border border-borde px-4 text-sm font-semibold text-texto transition-colors hover:border-marca hover:bg-carbon disabled:cursor-not-allowed disabled:opacity-60";
export const CLAVE_GANCHOS = "ganchos";

type PropiedadesEdicion = {
  curso: string;
  numero: number;
  teleprompter: Teleprompter;
  edicion: EdicionGuion;
  bloqueo: string | null;
  idBloqueo: string;
  abrir: (edicion: Exclude<EdicionGuion, null>) => void;
  cerrar: () => void;
  alGuardado: (teleprompter: Teleprompter) => void;
  enfocarAlVolver: (clave: string) => (boton: HTMLButtonElement | null) => void;
};

type PropiedadesEscenas = Omit<PropiedadesEdicion, "teleprompter"> & {
  teleprompter: Teleprompter | null;
  escenas: Escena[];
  previa: string | null;
};

export function EscenasEditables({
  curso,
  numero,
  escenas,
  previa,
  teleprompter,
  edicion,
  bloqueo,
  idBloqueo,
  abrir,
  cerrar,
  alGuardado,
  enfocarAlVolver,
}: PropiedadesEscenas) {
  if (escenas.length === 0) {
    return (
      <p className="border border-borde bg-superficie p-6 text-tenue">
        Esta lección todavía no tiene escenas.
      </p>
    );
  }
  const editables = new Map(
    teleprompter?.escenas.map((escena) => [escena.id, escena]) ?? [],
  );
  return escenas.map((escena) => {
    const editable = editables.get(escena.id);
    const editando = edicion?.tipo === "escena" && edicion.id === escena.id;
    const boton = editable && !editando ? (
      <button
        ref={enfocarAlVolver(escena.id)}
        type="button"
        className={BOTON_EDITAR}
        aria-label={`Editar ${escena.id}`}
        aria-describedby={bloqueo && edicion === null ? idBloqueo : undefined}
        disabled={edicion !== null || bloqueo !== null}
        onClick={() => abrir({ tipo: "escena", id: escena.id })}
      >
        Editar
      </button>
    ) : undefined;
    return (
      <div key={escena.id} className="grid gap-3">
        <TarjetaEscena escena={escena} previa={previa} acciones={boton} />
        {editable && editando && teleprompter ? (
          <EditorEscenaGuion
            curso={curso}
            numero={numero}
            version={teleprompter.version}
            escena={editable}
            bloqueo={bloqueo}
            alGuardado={alGuardado}
            alCancelar={cerrar}
          />
        ) : null}
      </div>
    );
  });
}

function ListaGanchos({ teleprompter }: { teleprompter: Teleprompter }) {
  return (
    <div className="mt-4 grid gap-3">
      {teleprompter.ganchos.map((gancho) => (
        <article key={gancho.id} className="border border-borde bg-superficie p-5">
          <h3 className="font-semibold">{gancho.titulo}</h3>
          <p className="mt-2 text-sm leading-6 text-tenue">{gancho.texto}</p>
        </article>
      ))}
      {teleprompter.ganchos.length === 0 ? (
        <p className="text-sm text-tenue">Este guion no tiene ganchos.</p>
      ) : null}
    </div>
  );
}

export function SeccionGanchos({
  curso,
  numero,
  teleprompter,
  edicion,
  bloqueo,
  idBloqueo,
  abrir,
  cerrar,
  alGuardado,
  enfocarAlVolver,
}: PropiedadesEdicion) {
  const editando = edicion?.tipo === "ganchos";
  return (
    <section className="mt-4 border-t border-borde pt-6" aria-labelledby="titulo-ganchos">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="titulo-ganchos" className="text-xl font-semibold">Ganchos de los shorts</h2>
        {teleprompter.ganchos.length > 0 && !editando ? (
          <button
            ref={enfocarAlVolver(CLAVE_GANCHOS)}
            type="button"
            className={BOTON_EDITAR}
            aria-describedby={bloqueo && edicion === null ? idBloqueo : undefined}
            disabled={edicion !== null || bloqueo !== null}
            onClick={() => abrir({ tipo: "ganchos" })}
          >
            Editar ganchos
          </button>
        ) : null}
      </div>
      {editando && teleprompter.ganchos.length > 0 ? (
        <div className="mt-4">
          <EditorGanchos
            curso={curso}
            numero={numero}
            version={teleprompter.version}
            ganchos={teleprompter.ganchos}
            bloqueo={bloqueo}
            alGuardado={alGuardado}
            alCancelar={cerrar}
          />
        </div>
      ) : (
        <ListaGanchos teleprompter={teleprompter} />
      )}
    </section>
  );
}
