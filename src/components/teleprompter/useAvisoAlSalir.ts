"use client";

import { useEffect } from "react";

const AVISO_SALIR = "Hay una toma o un texto sin guardar. ¿Salir igualmente?";

// Clics ya confirmados: si hay varios avisos activos (toma y texto a la vez), se pregunta una vez.
const confirmados = new WeakSet<Event>();

// El enlace del mismo origen que sacaría de la página con este clic, si lo hay. Los clics que
// abren otra pestaña o descargan, los enlaces externos y los saltos dentro de la página no salen.
function enlaceQueSale(evento: MouseEvent): HTMLAnchorElement | SVGAElement | null {
  if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) {
    return null;
  }
  const destino = evento.target;
  if (!(destino instanceof Element)) return null;
  const enlace = destino.closest<HTMLAnchorElement | SVGAElement>("a[href]");
  if (!enlace || enlace.hasAttribute("download")) return null;
  const objetivo = enlace.getAttribute("target");
  if (objetivo && objetivo !== "_self") return null;

  let url: URL;
  try {
    url = new URL(enlace.getAttribute("href") ?? "", window.location.href);
  } catch {
    return null;
  }
  if (url.origin !== window.location.origin) return null;
  const aqui = window.location;
  if (url.hash && url.pathname === aqui.pathname && url.search === aqui.search) return null;
  return enlace;
}

// Mientras `activo`, salir de la página pide confirmación: al recargar o cerrar la pestaña
// (`beforeunload`) y al pulsar un enlace interno, que con `<Link>` navega sin descargar la página.
// El clic se escucha en `document` en fase de captura, antes que React y que `<Link>`; si se
// cancela, ni se navega ni le llega el clic a nadie más.
export function useAvisoAlSalir(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    const alPulsar = (evento: MouseEvent) => {
      if (evento.defaultPrevented || confirmados.has(evento) || !enlaceQueSale(evento)) return;
      if (window.confirm(AVISO_SALIR)) {
        confirmados.add(evento);
        return;
      }
      evento.preventDefault();
      evento.stopImmediatePropagation();
    };
    window.addEventListener("beforeunload", alSalir);
    document.addEventListener("click", alPulsar, true);
    return () => {
      window.removeEventListener("beforeunload", alSalir);
      document.removeEventListener("click", alPulsar, true);
    };
  }, [activo]);
}
