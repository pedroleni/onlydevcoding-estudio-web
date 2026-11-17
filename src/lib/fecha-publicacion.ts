export function fechaPublicacionLegible(fecha: string): string {
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return fecha;

  const fechaFormateada = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(valor)
    .replaceAll(",", "")
    .replaceAll(".", "");
  const hora = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(valor);
  return `${fechaFormateada} · ${hora}`;
}
