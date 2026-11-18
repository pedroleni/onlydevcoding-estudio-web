// Única lista de acciones de la web: el tipo, la validación de las Server Actions y las
// etiquetas salen de aquí. Tiene que coincidir con el catálogo de la API.
export const IDS_ACCION = [
  "alinear-voz",
  "preparar-montaje",
  "previa-grabacion",
  "render-leccion",
  "video-final",
  "preparar-shorts",
  "render-short",
] as const;

export type IdAccion = (typeof IDS_ACCION)[number];

export const ETIQUETAS_ACCION: Record<IdAccion, string> = {
  "alinear-voz": "Alinear la voz",
  "preparar-montaje": "Preparar el montaje",
  "previa-grabacion": "Vista previa de grabación",
  "render-leccion": "Renderizar una versión nueva",
  "video-final": "Crear el vídeo final (−14 LUFS)",
  "preparar-shorts": "Preparar los shorts",
  "render-short": "Renderizar el short",
};

const IDS = new Set<string>(IDS_ACCION);

export function esIdAccion(valor: unknown): valor is IdAccion {
  return typeof valor === "string" && IDS.has(valor);
}
