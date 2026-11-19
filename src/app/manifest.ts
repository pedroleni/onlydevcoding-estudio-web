import type { MetadataRoute } from "next";

// Permite instalar el Estudio como app de Chrome, con su icono y su ventana propia.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OnlyDevCoding Estudio",
    short_name: "Estudio",
    description: "Gestión de la producción del canal OnlyDevCoding.",
    start_url: "/cursos",
    scope: "/",
    display: "standalone",
    background_color: "#141416",
    theme_color: "#141416",
    lang: "es-ES",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
