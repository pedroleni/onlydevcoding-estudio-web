export function Mensaje({ children }: { children: string }) {
  return (
    <p className="border border-borde bg-superficie p-6 text-tenue">{children}</p>
  );
}
