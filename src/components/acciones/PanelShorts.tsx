import { BotonAccion } from "@/components/acciones/BotonAccion";
import type { EstadoAccion } from "@/lib/tipos";

// Los montajes de shorts.json se llaman s<lección>-<N>-<slug>; de ahí sale «Short N».
function numeroShort(id: string, numero: number): number | null {
  const encaje = id.match(/^s(\d+)-(\d+)-/);
  if (!encaje || Number(encaje[1]) !== numero) return null;
  return Number(encaje[2]);
}

function accionParaRenderizar(
  preparar: EstadoAccion | undefined,
  renderizar: EstadoAccion | undefined,
): EstadoAccion | undefined {
  if (!renderizar) return undefined;
  const motivoYaVisible = preparar?.disponible === false && preparar.motivo === renderizar.motivo;
  return {
    ...renderizar,
    motivo: motivoYaVisible ? null : renderizar.motivo,
  };
}

function ListaShorts({
  accion,
  curso,
  numero,
}: {
  accion: EstadoAccion | undefined;
  curso: string;
  numero: number;
}) {
  if (!accion || accion.opciones.length === 0) return null;
  return (
    <ul className="grid gap-3 border-t border-borde pt-5">
      {accion.opciones.map((short) => {
        const numeroDelShort = numeroShort(short, numero);
        return (
          <li
            key={short}
            className="flex flex-wrap items-center justify-between gap-4 border border-borde bg-carbon p-4"
          >
            <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
              {numeroDelShort !== null ? (
                <span className="text-sm font-semibold text-texto">
                  Short {numeroDelShort}
                </span>
              ) : null}
              <span
                className={`break-all font-mono text-sm ${
                  numeroDelShort !== null ? "text-tenue" : "font-semibold text-texto"
                }`}
              >
                {short}
              </span>
            </span>
            <BotonAccion
              curso={curso}
              numero={numero}
              accion={accion}
              objetivo={short}
              textoBoton="Renderizar"
              nombreAccesible={`Renderizar ${short}`}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function PanelShorts({
  curso,
  numero,
  acciones,
}: {
  curso: string;
  numero: number;
  acciones: EstadoAccion[] | null;
}) {
  const preparar = acciones?.find(({ id }) => id === "preparar-shorts");
  const renderizar = acciones?.find(({ id }) => id === "render-short");
  const accionRenderizar = accionParaRenderizar(preparar, renderizar);
  const motivoSinShorts =
    accionRenderizar?.opciones.length === 0
      ? accionRenderizar.motivo
      : null;

  if (!preparar && !renderizar) return null;

  return (
    <section
      className="grid gap-5 border border-borde bg-superficie p-5"
      aria-labelledby="acciones-shorts"
    >
      <div>
        <h2 id="acciones-shorts" className="text-xl font-semibold">
          Montajes de los shorts
        </h2>
        <p className="mt-1 text-sm text-tenue">
          Son los vídeos que monta el estudio a partir de shorts.json: prepáralos
          y renderiza cada uno.
        </p>
      </div>

      {preparar ? (
        <BotonAccion curso={curso} numero={numero} accion={preparar} />
      ) : null}

      <ListaShorts accion={accionRenderizar} curso={curso} numero={numero} />

      {motivoSinShorts ? (
        <p className="text-sm text-tenue">{motivoSinShorts}</p>
      ) : null}
    </section>
  );
}
