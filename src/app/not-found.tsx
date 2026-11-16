import Link from "next/link";

export default function NoEncontrada() {
  return (
    <section className="flex min-h-[60vh] items-center py-12">
      <div className="max-w-2xl border-l-2 border-marca pl-6">
        <p className="font-mono text-sm text-marca">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-texto md:text-5xl">
          No se ha encontrado esta página
        </h1>
        <Link
          href="/cursos"
          className="mt-7 inline-flex min-h-11 items-center border border-borde bg-superficie px-4 text-sm font-medium text-texto hover:border-marca"
        >
          Volver a cursos
        </Link>
      </div>
    </section>
  );
}
