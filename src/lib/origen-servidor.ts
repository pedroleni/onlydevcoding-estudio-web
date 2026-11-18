import "server-only";

import { headers } from "next/headers";

import { HOST_ESTUDIO, ORIGEN_ESTUDIO } from "@/lib/origen-estudio";

// Comprobación común de las Server Actions: `Host` y `Origin` exactos del estudio. El Proxy
// ya lo exige antes; esto es la segunda barrera, antes de cualquier escritura.
export async function origenPermitido(): Promise<boolean> {
  const cabeceras = await headers();
  return (
    cabeceras.get("host") === HOST_ESTUDIO &&
    cabeceras.get("origin") === ORIGEN_ESTUDIO
  );
}
