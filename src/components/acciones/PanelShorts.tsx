import { BotonAccion } from "@/components/acciones/BotonAccion";
import type { EstadoAccion } from "@/lib/tipos";

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
  const motivoPrepararVisible =
    preparar?.disponible === false && preparar.motivo === renderizar?.motivo;
  const accionRenderizar = renderizar
    ? {
        ...renderizar,
        motivo: motivoPrepararVisible ? null : renderizar.motivo,
      }
    : undefined;
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
      <h2 id="acciones-shorts" className="text-xl font-semibold">
        Acciones de shorts
      </h2>

      {preparar ? (
        <BotonAccion curso={curso} numero={numero} accion={preparar} />
      ) : null}

      {accionRenderizar && accionRenderizar.opciones.length > 0 ? (
        <ul className="grid gap-3 border-t border-borde pt-5">
          {accionRenderizar.opciones.map((short) => (
            <li
              key={short}
              className="flex flex-wrap items-center justify-between gap-4 border border-borde bg-carbon p-4"
            >
              <span className="font-mono text-sm font-semibold text-texto">
                {short}
              </span>
              <BotonAccion
                curso={curso}
                numero={numero}
                accion={accionRenderizar}
                objetivo={short}
                textoBoton="Renderizar"
                nombreAccesible={`Renderizar ${short}`}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {motivoSinShorts ? (
        <p className="text-sm text-tenue">{motivoSinShorts}</p>
      ) : null}
    </section>
  );
}
