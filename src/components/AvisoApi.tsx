import { ErrorApi } from "@/lib/api";

export function AvisoApi({ error }: { error?: unknown }) {
  const rechazada = error instanceof ErrorApi;

  return (
    <section
      className="my-10 border border-borde bg-superficie p-6 md:my-16 md:p-8"
      role="alert"
      aria-labelledby="aviso-api-titulo"
    >
      <div className="max-w-2xl border-l-2 border-marca pl-5">
        <h1
          id="aviso-api-titulo"
          className="text-2xl font-semibold tracking-[-0.025em] text-texto md:text-3xl"
        >
          {rechazada
            ? `La API ha rechazado la petición (estado ${error.estado})`
            : "No se puede conectar con la API"}
        </h1>
        {rechazada ? (
          <p className="mt-3 leading-7 text-tenue">
            Revisa la petición y vuelve a intentarlo.
          </p>
        ) : (
          <p className="mt-3 leading-7 text-tenue">
            Arranca la API local del estudio en{" "}
            <code className="font-mono text-sm text-texto">127.0.0.1:8000</code>{" "}
            y vuelve a cargar esta página.
          </p>
        )}
      </div>
    </section>
  );
}
