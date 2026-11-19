import Link from "next/link";

// Cambia entre el teleprompter de la lección y el de los reels (ganchos verticales).
export function ModoTeleprompter({ activo }: { activo: "leccion" | "reels" }) {
  const opciones = [
    { id: "leccion", href: "/teleprompter", texto: "🎙 Lección" },
    { id: "reels", href: "/teleprompter/reels", texto: "📱 Reels" },
  ] as const;
  return (
    <nav aria-label="Modo del teleprompter" className="pt-4">
      <ul className="inline-flex rounded-full border border-borde bg-superficie p-1 text-sm">
        {opciones.map(({ id, href, texto }) => (
          <li key={id}>
            <Link
              href={href}
              aria-current={activo === id ? "page" : undefined}
              className={`block rounded-full px-4 py-1.5 font-medium transition-colors ${
                activo === id ? "bg-marca text-fondo" : "text-tenue hover:text-texto"
              }`}
            >
              {texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
