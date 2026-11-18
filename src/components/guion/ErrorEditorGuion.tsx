export type ErrorEditorGuionDatos = {
  mensaje: string;
  conflicto: boolean;
};

export function ErrorEditorGuion({
  error,
  alRecargar,
}: {
  error: ErrorEditorGuionDatos | null;
  alRecargar: () => void;
}) {
  if (!error) return null;

  return (
    <p role="alert" className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-ambar">
      {error.mensaje}
      {error.conflicto ? (
        <button type="button" onClick={alRecargar} className="border border-ambar px-3 py-1.5 font-semibold text-ambar">
          Recargar
        </button>
      ) : null}
    </p>
  );
}
