export const HOSTS_PUBLICACION = new Set([
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
  "linkedin.com",
  "www.linkedin.com",
]);

export function errorUrlPublicacion(valor: string): string | null {
  if (valor === "") return null;
  if (
    /\s/u.test(valor) ||
    Array.from(valor).some((caracter) => {
      const codigo = caracter.codePointAt(0) ?? 0;
      return codigo < 32 || codigo === 127;
    })
  ) {
    return "La URL de publicación no es válida";
  }

  try {
    const url = new URL(valor);
    const inicioAutoridad = valor.indexOf("://");
    const autoridad =
      inicioAutoridad >= 0
        ? valor.slice(inicioAutoridad + 3).split(/[/?#]/u, 1)[0]
        : "";
    if (
      url.protocol !== "https:" ||
      !HOSTS_PUBLICACION.has(url.hostname) ||
      url.username !== "" ||
      url.password !== "" ||
      url.port !== "" ||
      autoridad === "" ||
      autoridad.includes(":") ||
      autoridad.includes("\\")
    ) {
      return "La URL de publicación no está permitida";
    }
  } catch {
    return "La URL de publicación no es válida";
  }
  return null;
}
