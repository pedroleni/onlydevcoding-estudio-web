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

export function leerNumero(
  palabras: string[],
  inicio: number,
): { valor: number; fin: number } | null {
  let total = 0;
  let actual: number | null = null;
  let j = inicio;
  let leidas = 0;

  while (j < palabras.length) {
    const palabra = nucleo(palabras[j]);
    const siguiente = NUMEROS[nucleo(palabras[j + 1] ?? "")];

    if (palabra === "mil") {
      total += (actual ?? 1) * 1_000;
      actual = null;
    } else if (
      palabra === "y" &&
      actual !== null &&
      actual % 100 >= 30 &&
      actual % 10 === 0 &&
      siguiente < 10 &&
      !/[^\p{L}\p{N}]$/u.test(palabras[j - 1])
    ) {
      j++;
      actual += siguiente;
    } else if (palabra in NUMEROS) {
      const valor = NUMEROS[palabra];
      if (actual === null) actual = valor;
      else if (actual >= 100 && actual % 100 === 0 && valor < 100)
        actual += valor;
      else break;
    } else break;

    leidas++;
    const cierra = /[^\p{L}\p{N}]$/u.test(palabras[j]);
    j++;
    if (cierra) break;
  }

  if (!leidas) return null;
  return { valor: total + (actual ?? 0), fin: j };
}

export type Trozo = { t: string; dichas: string[] };

export function trocear(texto: string): Trozo[] {
  const palabras = texto.split(/\s+/).filter(Boolean);
  const trozos: Trozo[] = [];

  for (let i = 0; i < palabras.length; ) {
    const despuesDe = (palabra: string) =>
      palabra.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";

    if (
      nucleo(palabras[i]) === "punto" &&
      nucleo(palabras[i + 1] ?? "") === "barra"
    ) {
      trozos.push({
        t:
          (palabras[i].match(/^[¿¡("«]*/)?.[0] ?? "") +
          "./" +
          despuesDe(palabras[i + 1]),
        dichas: palabras.slice(i, i + 2),
      });
      i += 2;
      continue;
    }

    if (
      nucleo(palabras[i + 1] ?? "") === "punto" &&
      palabras[i + 2] &&
      !despuesDe(palabras[i]) &&
      !despuesDe(palabras[i + 1]) &&
      !["y", "de", "barra"].includes(nucleo(palabras[i + 2])) &&
      !["el", "un", "su", "desde", "usas"].includes(
        nucleo(palabras[i]),
      ) &&
      !(nucleo(palabras[i]) in NUMEROS)
    ) {
      const extension = palabras[i + 2].replace(/[^\p{L}\p{N}]*$/u, "");
      const cola = despuesDe(palabras[i + 2]);

      if (["archivo", "archivos"].includes(nucleo(palabras[i]))) {
        trozos.push(
          { t: palabras[i], dichas: [palabras[i]] },
          { t: `.${extension}${cola}`, dichas: palabras.slice(i + 1, i + 3) },
        );
      } else {
        trozos.push({
          t: `${palabras[i]}.${extension}${cola}`,
          dichas: palabras.slice(i, i + 3),
        });
      }
      i += 3;
      continue;
    }

    const nombre = nucleo(palabras[i]);
    const empieza =
      (nombre in NUMEROS &&
        (nombre !== "uno" || /[.,;:]$/.test(palabras[i]))) ||
      (nombre === "mil" && nucleo(palabras[i + 1] ?? "") in NUMEROS);
    const numero = empieza ? leerNumero(palabras, i) : null;

    if (!numero) {
      trozos.push({ t: palabras[i], dichas: [palabras[i]] });
      i++;
      continue;
    }

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

    const primera = palabras[i];
    const ultima = palabras[fin - 1];
    const antes = primera.match(/^[¿¡("«]*/)?.[0] ?? "";
    const despues = ultima.match(/[^\p{L}\p{N}]*$/u)?.[0] ?? "";
    trozos.push({
      t: antes + cifra + despues,
      dichas: palabras.slice(i, fin),
    });
    i = fin;
  }

  return trozos;
}
