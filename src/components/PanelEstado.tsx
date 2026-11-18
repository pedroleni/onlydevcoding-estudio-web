import { marcaPublicacion, REDES } from "@/lib/curso";
import type { EstadoLeccion, EstadoMontaje } from "@/lib/tipos";

const MONTAJE: Record<EstadoMontaje["estado"], { icono: string; texto: string }> = {
  al_dia: { icono: "✅", texto: "al día" },
  guion_cambiado: { icono: "⚠️", texto: "guion cambiado" },
  voz_sin_alinear: { icono: "⚠️", texto: "voz sin alinear" },
  sin_montaje: { icono: "⬜", texto: "sin montaje" },
};

function estaCompleto(hechas: number, total: number): boolean {
  return total > 0 && hechas >= total;
}

export function PanelEstado({
  estado,
  montaje,
}: {
  estado: EstadoLeccion;
  montaje?: EstadoMontaje | null;
}) {
  const vozCompleta = estaCompleto(estado.voz.hechas, estado.voz.total);
  const camaraCompleta = estaCompleto(
    estado.camara.hechas,
    estado.camara.total,
  );

  return (
    <aside
      className="border border-borde bg-superficie p-5 lg:sticky lg:top-6"
      aria-labelledby="estado-leccion-titulo"
    >
      <h2
        id="estado-leccion-titulo"
        className="text-lg font-semibold tracking-[-0.02em]"
      >
        Estado de la lección
      </h2>

      <ul className="mt-5 grid gap-3 text-sm" aria-label="Progreso de producción">
        <li>
          <span>{estado.guion ? "✅" : "⬜"} Guion preparado</span>
        </li>
        <li className="flex items-start justify-between gap-4">
          <span>{vozCompleta ? "✅" : "⬜"} Voz grabada</span>
          <span className="shrink-0 font-mono text-xs text-tenue">
            {estado.voz.hechas}/{estado.voz.total}
          </span>
        </li>
        <li className="flex items-start justify-between gap-4">
          <span>{camaraCompleta ? "✅" : "⬜"} Cámara grabada</span>
          <span className="shrink-0 font-mono text-xs text-tenue">
            {estado.camara.hechas}/{estado.camara.total}
          </span>
        </li>
        <li>
          <span>{estado.video_final ? "✅" : "⬜"} Vídeo final</span>
        </li>
        {montaje ? (
          <li className="flex items-center gap-1">
            <span aria-hidden="true">{MONTAJE[montaje.estado].icono}</span>
            <span>Montaje: {MONTAJE[montaje.estado].texto}</span>
          </li>
        ) : null}
      </ul>

      <div className="mt-6 border-t border-borde pt-5">
        <h3 className="text-sm font-semibold text-texto">Publicación</h3>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm text-tenue">
          {REDES.map(([clave, nombre]) => {
            const marca = marcaPublicacion(estado, clave, nombre);
            return (
              <li key={clave} className="flex items-center gap-2">
                <span aria-hidden="true">{marca.icono}</span>
                <span>{marca.texto}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
