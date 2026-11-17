const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function fechaUtc(fecha: string): Date | null {
  const partes = fecha.match(PATRON_FECHA);
  if (!partes) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  if (ano < 1) return null;
  const resultado = new Date(0);
  resultado.setUTCHours(0, 0, 0, 0);
  resultado.setUTCFullYear(ano, mes - 1, dia);

  if (
    resultado.getUTCFullYear() !== ano ||
    resultado.getUTCMonth() !== mes - 1 ||
    resultado.getUTCDate() !== dia
  ) {
    return null;
  }
  return resultado;
}

function formatoUtc(fecha: Date): string {
  const ano = String(fecha.getUTCFullYear()).padStart(4, "0");
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function fechaLocal(ahora: Date): string {
  const ano = String(ahora.getFullYear()).padStart(4, "0");
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function esFechaValida(fecha: string): boolean {
  return fechaUtc(fecha) !== null;
}

export function sumarDias(fecha: string, dias: number): string {
  const resultado = fechaUtc(fecha);
  if (!resultado || !Number.isInteger(dias)) {
    throw new RangeError("La fecha o el número de días no es válido");
  }
  resultado.setUTCDate(resultado.getUTCDate() + dias);
  return formatoUtc(resultado);
}

export function lunesDe(fecha: string): string {
  const fechaBase = fechaUtc(fecha);
  if (!fechaBase) throw new RangeError("La fecha no es válida");
  const diaSemana = fechaBase.getUTCDay();
  return sumarDias(fecha, -(diaSemana === 0 ? 6 : diaSemana - 1));
}

export function diasDeSemana(fecha: string): string[] {
  const lunes = lunesDe(fecha);
  return Array.from({ length: 7 }, (_, indice) => sumarDias(lunes, indice));
}

export function fechaLegible(fecha: string): string {
  const fechaBase = fechaUtc(fecha);
  if (!fechaBase) throw new RangeError("La fecha no es válida");

  const partes = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).formatToParts(fechaBase);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value.replace(/\.$/, "") ?? "";
  return `${valor("weekday")} ${valor("day")} ${valor("month")}`;
}
