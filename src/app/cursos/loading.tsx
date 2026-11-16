export default function CargandoCursos() {
  return (
    <section className="py-10 md:py-16" aria-busy="true" aria-live="polite">
      <p className="text-sm text-tenue">Cargando cursos...</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2" aria-hidden="true">
        <div className="h-36 border border-borde bg-superficie" />
        <div className="h-36 border border-borde bg-superficie" />
      </div>
    </section>
  );
}
