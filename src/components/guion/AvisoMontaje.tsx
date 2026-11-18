import { BotonAccion } from "@/components/acciones/BotonAccion";
import type { EstadoAccion, EstadoMontaje, IdAccion } from "@/lib/tipos";

export function AvisoMontaje({
  curso,
  numero,
  montaje,
  acciones,
}: {
  curso: string;
  numero: number;
  montaje: EstadoMontaje | null;
  acciones: EstadoAccion[] | null;
}) {
  if (!montaje || montaje.estado === "al_dia") return null;

  let texto: string;
  let idAccion: IdAccion;
  if (montaje.estado === "voz_sin_alinear") {
    texto = `Voz sin alinear: ${montaje.sin_alinear.join(", ")}.`;
    idAccion = "alinear-voz";
  } else if (montaje.estado === "guion_cambiado") {
    texto = "Guion cambiado: hay que regenerar el montaje.";
    idAccion = "preparar-montaje";
  } else {
    texto = "Esta lección aún no tiene montaje.";
    idAccion = "preparar-montaje";
  }
  const accion = acciones?.find(({ id }) => id === idAccion);

  return (
    <aside className="border border-ambar bg-superficie p-5" aria-label="Estado del montaje">
      <p className="font-medium text-ambar">{texto}</p>
      {accion ? (
        <div className="mt-4">
          <BotonAccion curso={curso} numero={numero} accion={accion} />
        </div>
      ) : null}
    </aside>
  );
}
