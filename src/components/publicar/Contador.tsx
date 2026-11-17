import { longitudPublicacion } from "@/lib/limites";

export function Contador({
  valor,
  limite,
  unidad,
  className = "",
}: {
  valor: string | number;
  limite: number;
  unidad?: string;
  className?: string;
}) {
  const cantidad =
    typeof valor === "string" ? longitudPublicacion(valor) : valor;

  return (
    <span
      className={`shrink-0 font-mono text-xs ${cantidad > limite ? "text-red-400" : "text-tenue"} ${className}`.trim()}
    >
      {cantidad}/{limite}{unidad ? ` ${unidad}` : ""}
    </span>
  );
}
