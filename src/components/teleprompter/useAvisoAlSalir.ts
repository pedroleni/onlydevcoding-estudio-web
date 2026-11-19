"use client";

import { useEffect } from "react";

const AVISO_SALIR = "Hay una toma o un texto sin guardar. ¿Salir igualmente?";

// Clics ya confirmados: si hay varios avisos activos (toma y texto a la vez), se pregunta una vez.
const confirmados = new WeakSet<Event>();

function esClicSimple(evento: MouseEvent): boolean {
  return !(
    evento.button !== 0 ||
    evento.metaKey ||
    evento.ctrlKey ||
    evento.shiftKey ||
    evento.altKey
  );
}

function urlDelEnlace(enlace: HTMLAnchorElement | SVGAElement): URL | null {
  try {
    return new URL(enlace.getAttribute("href") ?? "", window.location.href);
  } catch {
    return null;
  }
}

function esSaltoEnLaPagina(url: URL): boolean {
  const aqui = window.location;
  return Boolean(url.hash && url.pathname === aqui.pathname && url.search === aqui.search);
}

// El enlace del mismo origen que sacaría de la página con este clic, si lo hay. Los clics que
// abren otra pestaña o descargan, los enlaces externos y los saltos dentro de la página no salen.
function enlaceQueSale(evento: MouseEvent): HTMLAnchorElement | SVGAElement | null {
  if (!esClicSimple(evento)) return null;
  const destino = evento.target;
  if (!(destino instanceof Element)) return null;
  const enlace = destino.closest<HTMLAnchorElement | SVGAElement>("a[href]");
  if (!enlace || enlace.hasAttribute("download")) return null;
  const objetivo = enlace.getAttribute("target");
  if (objetivo && objetivo !== "_self") return null;

  const url = urlDelEnlace(enlace);
  if (!url) return null;
  if (url.origin !== window.location.origin) return null;
  if (esSaltoEnLaPagina(url)) return null;
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
