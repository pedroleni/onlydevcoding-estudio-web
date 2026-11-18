const FECHA_HORA_CORTA = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "short",
  timeStyle: "short",
});

export function fechaHoraCorta(valor: string): string {
  return FECHA_HORA_CORTA.format(new Date(valor));
}
