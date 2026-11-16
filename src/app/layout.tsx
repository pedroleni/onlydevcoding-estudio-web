import type { Metadata } from "next";
import { Suspense } from "react";

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
        <Suspense
          fallback={
            <div
              className="min-h-16 border-b border-borde bg-superficie"
              aria-hidden="true"
            />
          }
        >
          <BarraNavegacion />
        </Suspense>
        <main className="contenido-principal">{children}</main>
      </body>
    </html>
  );
}
