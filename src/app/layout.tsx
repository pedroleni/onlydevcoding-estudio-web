import type { Metadata } from "next";

import { BarraNavegacion } from "@/components/BarraNavegacion";

import "./globals.css";

export const metadata: Metadata = {
  title: "OnlyDevCoding Estudio",
  description: "Herramientas locales para producir los cursos de OnlyDevCoding.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>
        <BarraNavegacion />
        <main className="contenido-principal">{children}</main>
      </body>
    </html>
  );
}
