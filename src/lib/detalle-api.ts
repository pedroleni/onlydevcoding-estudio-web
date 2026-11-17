interface OpcionesDetalle {
  textoBruto?: boolean;
}

export async function detalleDe(
  respuesta: Response,
  { textoBruto = true }: OpcionesDetalle = {},
): Promise<unknown> {
  try {
    const datos = (await respuesta.clone().json()) as { detail?: unknown };
    return datos.detail;
  } catch {
    if (!textoBruto) return undefined;
    try {
      return await respuesta.text();
    } catch {
      return undefined;
    }
  }
}
