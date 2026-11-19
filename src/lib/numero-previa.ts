const NOMBRE_PREVIA = /(?:^|\/)previa-v(\d+)(?:-([a-z0-9][a-z0-9-]{0,60}))?\.mp4$/i;

type DatosPrevia = {
  numero: number;
  apellido: string | null;
};

function datosPrevia(ruta: string): DatosPrevia | null {
  const coincidencia = ruta.match(NOMBRE_PREVIA);
  if (!coincidencia) return null;

  return {
    numero: Number(coincidencia[1]),
    apellido: coincidencia[2]?.toLowerCase() ?? null,
  };
}

// El número de `previa-vN[-apellido].mp4`, con o sin carpeta delante.
export function numeroPrevia(ruta: string): number | null {
  return datosPrevia(ruta)?.numero ?? null;
}

export function etiquetaPrevia(ruta: string): string | null {
  const datos = datosPrevia(ruta);
  if (!datos) return null;

  const base = `Previa ${datos.numero}`;
  return datos.apellido ? `${base} · ${datos.apellido.replaceAll("-", " ")}` : base;
}

export function previaPorDefecto(previas: string[]): string | null {
  let elegida: { ruta: string; datos: DatosPrevia } | null = null;

  for (const ruta of previas) {
    const datos = datosPrevia(ruta);
    if (!datos) continue;

    const superaNumero = !elegida || datos.numero > elegida.datos.numero;
    const priorizaSinApellido =
      elegida &&
      datos.numero === elegida.datos.numero &&
      elegida.datos.apellido !== null &&
      datos.apellido === null;

    if (superaNumero || priorizaSinApellido) elegida = { ruta, datos };
  }

  return elegida?.ruta ?? previas.at(-1) ?? null;
}
