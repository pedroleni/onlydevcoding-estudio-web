// Deriva un id válido (minúsculas, sin tildes, guiones) del nombre que escribe el autor.
export function idDesdeNombre(nombre: string, maximo: number): string {
  return nombre
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maximo)
    .replace(/-+$/g, "");
}
