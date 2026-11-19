export const NUMEROS: Record<string, number> = {
  cero: 0,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiuno: 21,
  veintiun: 21,
  veintidos: 22,
  veintitres: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

const nucleo = (palabra: string) =>
  palabra
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

export type Trozo = { t: string; dichas: string[] };

type PasoNumero = {
  actual: number | null;
  total: number;
  indice: number;
};

function leerPalabraNumero(
  palabras: string[],
  indice: number,
  actual: number | null,
  total: number,
): PasoNumero | null {
  const palabra = nucleo(palabras[indice]);
  const siguiente = NUMEROS[nucleo(palabras[indice + 1] ?? "")];

  if (palabra === "mil") {
    return { total: total + (actual ?? 1) * 1_000, actual: null, indice };
  }
  if (
    palabra === "y" &&
    actual !== null &&
    actual % 100 >= 30 &&
    actual % 10 === 0 &&
    siguiente < 10 &&
    !/[^\p{L}\p{N}]$/u.test(palabras[indice - 1])
  ) {
    return { total, actual: actual + siguiente, indice: indice + 1 };
  }
  if (!(palabra in NUMEROS)) return null;

  const valor = NUMEROS[palabra];
  if (actual === null) return { total, actual: valor, indice };
  if (actual >= 100 && actual % 100 === 0 && valor < 100) {
    return { total, actual: actual + valor, indice };
  }
  return null;
}

export function leerNumero(
  palabras: string[],
  inicio: number,
): { valor: number; fin: number } | null {
  let total = 0;
  let actual: number | null = null;
  let j = inicio;
  let leidas = 0;

  while (j < palabras.length) {
    const paso = leerPalabraNumero(palabras, j, actual, total);
    if (!paso) break;
    ({ actual, total, indice: j } = paso);

    leidas++;
    const cierra = /[^\p{L}\p{N}]$/u.test(palabras[j]);
    j++;
    if (cierra) break;
  }

  if (!leidas) return null;
  return { valor: total + (actual ?? 0), fin: j };
}

// Los trozos que salen a partir de una palabra y el índice de la siguiente sin trocear.
type ResultadoTroceo = { trozos: Trozo[]; fin: number };

function despuesDe(palabra: string): string {
  return palabra.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
}

// «punto barra» se escribe «./».
function trocearPuntoBarra(palabras: string[], inicio: number): ResultadoTroceo | null {
  if (
    nucleo(palabras[inicio]) !== "punto" ||
    nucleo(palabras[inicio + 1] ?? "") !== "barra"
  ) {
    return null;
  }
  return {
    trozos: [{
      t:
        (palabras[inicio].match(/^[¿¡("«]*/)?.[0] ?? "") +
        "./" +
        despuesDe(palabras[inicio + 1]),
      dichas: palabras.slice(inicio, inicio + 2),
    }],
    fin: inicio + 2,
  };
}

// «main punto jsx» se escribe «main.jsx»; tras «archivo» solo se junta la extensión.
function trocearExtension(palabras: string[], inicio: number): ResultadoTroceo | null {
  if (
    nucleo(palabras[inicio + 1] ?? "") !== "punto" ||
    !palabras[inicio + 2] ||
    despuesDe(palabras[inicio]) ||
    despuesDe(palabras[inicio + 1]) ||
    ["y", "de", "barra"].includes(nucleo(palabras[inicio + 2])) ||
    ["el", "un", "su", "desde", "usas"].includes(nucleo(palabras[inicio])) ||
    nucleo(palabras[inicio]) in NUMEROS
  ) {
    return null;
  }

  const extension = palabras[inicio + 2].replace(/[^\p{L}\p{N}]*$/u, "");
  const cola = despuesDe(palabras[inicio + 2]);
  if (["archivo", "archivos"].includes(nucleo(palabras[inicio]))) {
    return {
      trozos: [
        { t: palabras[inicio], dichas: [palabras[inicio]] },
        { t: `.${extension}${cola}`, dichas: palabras.slice(inicio + 1, inicio + 3) },
      ],
      fin: inicio + 3,
    };
  }
  return {
    trozos: [{
      t: `${palabras[inicio]}.${extension}${cola}`,
      dichas: palabras.slice(inicio, inicio + 3),
    }],
    fin: inicio + 3,
  };
}

function empiezaNumero(palabras: string[], inicio: number): boolean {
  const nombre = nucleo(palabras[inicio]);
  return (
    (nombre in NUMEROS &&
      (nombre !== "uno" || /[.,;:]$/.test(palabras[inicio]))) ||
    (nombre === "mil" && nucleo(palabras[inicio + 1] ?? "") in NUMEROS)
  );
}

// Un número dicho en palabras (con decimales tras «punto») se escribe en cifras.
function trocearNumero(palabras: string[], inicio: number): ResultadoTroceo | null {
  const numero = empiezaNumero(palabras, inicio) ? leerNumero(palabras, inicio) : null;
  if (!numero) return null;

  let fin = numero.fin;
  let cifra = String(numero.valor);
  if (
    nucleo(palabras[fin] ?? "") === "punto" &&
    !/[.,;:?!…]$/.test(palabras[fin - 1]) &&
    nucleo(palabras[fin + 1] ?? "") in NUMEROS
  ) {
    const decimal = leerNumero(palabras, fin + 1);
    if (decimal) {
      cifra += `.${decimal.valor}`;
      fin = decimal.fin;
    }
  }

  const primera = palabras[inicio];
  const ultima = palabras[fin - 1];
  const antes = primera.match(/^[¿¡("«]*/)?.[0] ?? "";
  const despues = ultima.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
  return {
    trozos: [{
      t: antes + cifra + despues,
      dichas: palabras.slice(inicio, fin),
    }],
    fin,
  };
}

function trocearPalabra(palabras: string[], inicio: number): ResultadoTroceo {
  return {
    trozos: [{ t: palabras[inicio], dichas: [palabras[inicio]] }],
    fin: inicio + 1,
  };
}

export function trocear(texto: string): Trozo[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const trozos: Trozo[] = [];

  for (let i = 0; i < palabras.length; ) {
    const resultado =
      trocearPuntoBarra(palabras, i) ??
      trocearExtension(palabras, i) ??
      trocearNumero(palabras, i) ??
      trocearPalabra(palabras, i);
    trozos.push(...resultado.trozos);
    i = resultado.fin;
  }

  return trozos;
}
