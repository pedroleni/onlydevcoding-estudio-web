import { BotonAccion } from "@/components/acciones/BotonAccion";
import { textoLegible } from "@/lib/texto-legible";
import { urlToma } from "@/lib/medios";
import type {
  Avance,
  EscenaTeleprompter,
  EstadoAccion,
} from "@/lib/tipos";

export function GrabacionesVoz({
  curso,
  numero,
  escenas,
  avance,
  sinAlinear,
  accion,
}: {
  curso: string;
  numero: number;
  escenas: EscenaTeleprompter[];
  avance: Avance;
  sinAlinear: string[];
  accion: EstadoAccion | null;
}) {
  return (
    <section aria-labelledby="grabacion-voz">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="grabacion-voz" className="text-xl font-semibold">
          Voz en off
        </h2>
        <span className="font-mono text-xs text-tenue">
          {avance.hechas}/{avance.total}
        </span>
      </div>

      {accion || sinAlinear.length > 0 ? (
        <div className="mt-4 grid gap-3 border border-borde bg-superficie p-4">
          {sinAlinear.length > 0 ? (
            <p className="text-sm text-ambar">
              Voz sin alinear: {sinAlinear.join(", ")}.
            </p>
          ) : null}
          {accion ? (
            <BotonAccion curso={curso} numero={numero} accion={accion} />
          ) : null}
        </div>
      ) : null}

      {escenas.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {escenas.map((escena) => {
            const src = escena.toma
              ? urlToma(escena.toma, escena.version_toma)
              : null;

            return (
              <li
                key={escena.id}
                className="border border-borde bg-superficie p-4 text-sm"
              >
                <span className="font-medium">
                  {textoLegible(escena.titulo)}
                </span>
                <span className="mt-2 block font-mono text-xs text-tenue">
                  {escena.id}
                </span>
                {src ? (
                  <audio
                    className="mt-4 w-full"
                    src={src}
                    controls
                    preload="none"
                    aria-label={`Toma de ${escena.id}`}
                  />
                ) : (
                  <span className="mt-4 block text-tenue">Sin grabar</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 border border-borde bg-superficie p-5 text-sm text-tenue">
          No hay escenas de voz en off.
        </p>
      )}
    </section>
  );
}
