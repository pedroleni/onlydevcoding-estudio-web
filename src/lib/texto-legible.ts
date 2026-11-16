interface Palabra {
  apertura: string;
  nucleo: string;
  cierre: string;
}

const EXTENSIONES_Y_DOMINIOS = new Set([
  "jsx", "js", "ts", "tsx", "mjs", "cjs", "json", "html", "css", "scss",
  "md", "mdx", "env", "py", "sh", "yml", "yaml", "toml", "txt", "svg",
  "png", "jpg", "jpeg", "webp", "gif", "mp4", "mov", "wav", "com", "org",
  "dev", "net", "io", "es", "app", "config",
]);

const MIEMBROS_JAVASCRIPT = new Set([
  "log", "error", "warn", "random", "now", "length", "key", "render", "count",
  "map", "filter", "reduce", "find", "push", "then", "catch", "value", "current",
  "children", "props", "env", "json", "title", "titulo", "id", "name", "nombre",
]);

const ANTES_DE_PUNTO_BARRA = new Set([
  "from",
  "desde",
  "por",
  "en",
  "import",
]);

// Evita la frase habitual «cada punto es» pese a que «es» también sea un TLD.
const ANTES_DE_PUNTO_EXCLUIDAS = new Set(["cada"]);

const NUMEROS_EN_LETRA = new Set([
  "cero", "uno", "una", "dos", "tres", "cuatro", "cinco", "seis",
  "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
  "quince", "dieciseis", "diecisiete", "dieciocho", "diecinueve", "veinte",
  "veintiuno", "veintiuna", "veintidos", "veintitres", "veinticuatro",
  "veinticinco", "veintiseis", "veintisiete", "veintiocho", "veintinueve",
  "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta",
  "noventa", "cien", "ciento", "doscientos", "trescientos", "cuatrocientos",
  "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos",
  "mil", "millon", "millones",
]);

function nucleoNormalizado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function separarPalabra(texto: string): Palabra | null {
  const coincidencia = texto.match(/\p{L}+/u);

  if (!coincidencia || coincidencia.index === undefined) {
    return null;
  }

  const inicio = coincidencia.index;
  const fin = inicio + coincidencia[0].length;
  return {
    apertura: texto.slice(0, inicio),
    nucleo: coincidencia[0],
    cierre: texto.slice(fin),
  };
}

function reemplazarPuntoBarra(partes: string[]): void {
  for (let indice = 2; indice + 4 < partes.length; indice += 2) {
    const anterior = separarPalabra(partes[indice - 2]);
    const punto = separarPalabra(partes[indice]);
    const barra = separarPalabra(partes[indice + 2]);
    const posterior = separarPalabra(partes[indice + 4]);

    if (
      anterior &&
      punto &&
      barra &&
      posterior &&
      ANTES_DE_PUNTO_BARRA.has(nucleoNormalizado(anterior.nucleo)) &&
      nucleoNormalizado(punto.nucleo) === "punto" &&
      nucleoNormalizado(barra.nucleo) === "barra"
    ) {
      partes[indice] = `${punto.apertura}./${barra.cierre}`;
      partes[indice + 1] = "";
      partes[indice + 2] = "";
      // Pegado a la palabra siguiente solo si «barra» no lleva puntuación detrás.
      if (barra.cierre === "") {
        partes[indice + 3] = "";
      }
    }
  }
}

function reemplazarExtensiones(partes: string[]): void {
  for (let indice = partes.length - 5; indice >= 0; indice -= 2) {
    const anterior = separarPalabra(partes[indice]);
    const punto = separarPalabra(partes[indice + 2]);
    const posterior = separarPalabra(partes[indice + 4]);

    if (!anterior || !punto || !posterior) {
      continue;
    }

    const nucleoAnterior = nucleoNormalizado(anterior.nucleo);
    const nucleoPunto = nucleoNormalizado(punto.nucleo);
    const nucleoPosterior = nucleoNormalizado(posterior.nucleo);
    const pareceCodigo =
      EXTENSIONES_Y_DOMINIOS.has(nucleoPosterior) ||
      /\p{Ll}\p{Lu}/u.test(posterior.nucleo) ||
      MIEMBROS_JAVASCRIPT.has(nucleoPosterior);

    if (
      nucleoPunto !== "punto" ||
      anterior.cierre !== "" ||
      punto.cierre !== "" ||
      !pareceCodigo ||
      ANTES_DE_PUNTO_EXCLUIDAS.has(nucleoAnterior) ||
      NUMEROS_EN_LETRA.has(nucleoAnterior)
    ) {
      continue;
    }

    const extension = `.${posterior.nucleo}${posterior.cierre}`;

    if (nucleoAnterior === "archivo" || nucleoAnterior === "archivos") {
      partes[indice + 2] = extension;
      partes[indice + 3] = "";
      partes[indice + 4] = "";
      continue;
    }

    partes[indice] = `${partes[indice]}.${posterior.nucleo}${posterior.cierre}`;
    partes[indice + 1] = "";
    partes[indice + 2] = "";
    partes[indice + 3] = "";
    partes[indice + 4] = "";
  }
}

export function textoLegible(texto: string): string {
  const partes = texto.split(/(\s+)/);
  reemplazarPuntoBarra(partes);
  reemplazarExtensiones(partes);
  return partes.join("");
}
