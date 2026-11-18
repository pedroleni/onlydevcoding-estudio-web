import { BotonAccion } from "@/components/acciones/BotonAccion";
import { EntregaTomas } from "@/components/entregas/EntregaTomas";
import { urlToma } from "@/lib/medios";
import { textoLegible } from "@/lib/texto-legible";
import type {
  Avance,
  EscenaCamara,
  EstadoAccion,
  GanchoCamara,
  TomasCamara as DatosCamara,
} from "@/lib/tipos";

function FilaEscena({
  curso,
  numero,
  escena,
  mejorar,
}: {
  curso: string;
  numero: number;
  escena: EscenaCamara;
  mejorar: EstadoAccion | null;
}) {
  return (
    <li className="grid content-start gap-3 border border-borde bg-superficie p-4 text-sm">
      <div className="grid gap-1">
        <span className="font-medium">{textoLegible(escena.titulo)}</span>
        <span className="font-mono text-xs text-tenue">{escena.id}</span>
      </div>
      {escena.video ? (
        <video
          className="aspect-video w-full bg-fondo"
          src={urlToma(escena.video, escena.version)}
          controls
          preload="metadata"
          aria-label={`Toma de ${escena.id}`}
        />
      ) : (
        <span className="text-tenue">Sin grabar</span>
      )}
      {escena.original || escena.mejorada ? (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {escena.original ? (
            <span className="min-w-0 break-all font-mono text-xs text-tenue">
              {escena.original}
            </span>
          ) : null}
          {escena.mejorada ? <span className="text-verde">✓ Mejorada con IA</span> : null}
        </div>
      ) : null}
      {mejorar && escena.original ? (
        <BotonAccion
          curso={curso}
          numero={numero}
          accion={mejorar}
          objetivo={escena.id}
          nombreAccesible={`Mejorar ${escena.id} con IA`}
          confirmar={`Tarda unos 15 minutos por toma. ¿Mejorar ${escena.id} con IA?`}
        />
      ) : null}
    </li>
  );
}

function FilaGancho({ gancho }: { gancho: GanchoCamara }) {
  return (
    <li className="grid content-start gap-3 border border-borde bg-superficie p-4 text-sm">
      <div className="grid gap-1">
        <span className="font-medium">{textoLegible(gancho.titulo)}</span>
        <span className="font-mono text-xs text-tenue">
          {gancho.toma ? `${gancho.id} · ${gancho.toma}` : gancho.id}
        </span>
      </div>
      {gancho.video ? (
        <>
          <video
            className="aspect-[9/16] max-h-96 w-auto max-w-full justify-self-start bg-fondo"
            src={urlToma(gancho.video, gancho.version)}
            controls
            preload="metadata"
            aria-label={`Toma del gancho ${gancho.id}`}
          />
          <span className={gancho.color ? "text-verde" : "text-ambar"}>
            {gancho.color ? "Color ajustado" : "Color sin ajustar"}
          </span>
        </>
      ) : (
        <span className="text-tenue">Sin grabar</span>
      )}
    </li>
  );
}

// Grabaciones: entrega de las tomas de la lección y lo ya colocado de cámara y de los ganchos.
export function TomasCamara({
  curso,
  numero,
  camara,
  acciones,
  avance,
}: {
  curso: string;
  numero: number;
  // null si no se ha podido leer `/camara`: la pestaña sigue en pie con un aviso.
  camara: DatosCamara | null;
  acciones: EstadoAccion[] | null;
  avance: Avance;
}) {
  const mejorar = acciones?.find(({ id }) => id === "mejorar-toma") ?? null;
  const color = acciones?.find(({ id }) => id === "color-ganchos") ?? null;

  return (
    <section aria-labelledby="grabacion-camara" className="grid gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="grabacion-camara" className="text-xl font-semibold">
          Tomas a cámara y ganchos
        </h2>
        <span className="font-mono text-xs text-tenue">
          {avance.hechas}/{avance.total}
        </span>
      </div>

      <EntregaTomas curso={curso} numero={numero} acciones={acciones} />

      {camara ? (
        <>
          <div className="grid gap-3">
            <h3 className="m-0 text-base font-semibold">Escenas a cámara</h3>
            {camara.escenas.length > 0 ? (
              <ul className="grid gap-3 sm:grid-cols-2">
                {camara.escenas.map((escena) => (
                  <FilaEscena
                    key={escena.id}
                    curso={curso}
                    numero={numero}
                    escena={escena}
                    mejorar={mejorar}
                  />
                ))}
              </ul>
            ) : (
              <p className="m-0 border border-borde bg-superficie p-5 text-sm text-tenue">
                No hay escenas de cámara.
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <h3 className="m-0 text-base font-semibold">Ganchos</h3>
            {camara.ganchos.length > 0 ? (
              <>
                {color ? <BotonAccion curso={curso} numero={numero} accion={color} /> : null}
                <ul className="grid gap-3 sm:grid-cols-2">
                  {camara.ganchos.map((gancho) => (
                    <FilaGancho key={gancho.id} gancho={gancho} />
                  ))}
                </ul>
              </>
            ) : (
              <p className="m-0 border border-borde bg-superficie p-5 text-sm text-tenue">
                No hay ganchos.
              </p>
            )}
          </div>
        </>
      ) : (
        <p className="m-0 border border-borde bg-superficie p-5 text-sm text-ambar">
          No se han podido leer las tomas a cámara.
        </p>
      )}
    </section>
  );
}
