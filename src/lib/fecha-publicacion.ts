export function fechaPublicacionLegible(
  fecha: string,
  opciones: Pick<Intl.DateTimeFormatOptions, "timeZone"> = {},
): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;

  const fechaFormateada = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opciones,
  })
    .format(valor)
    .replaceAll(",", "")
    .replaceAll(".", "");
  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...opciones,
  }).format(valor);
  return `${fechaFormateada} · ${hora}`;
}
