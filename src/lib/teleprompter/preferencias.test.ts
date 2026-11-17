import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CLAVE_PREFERENCIAS,
  guardarPreferencias,
  leerPreferencias,
  normalizarPreferencias,
  PREFERENCIAS_POR_DEFECTO,
  suscribirPreferencias,
} from "@/lib/teleprompter/preferencias";

function almacenCaido(): Storage {
  const falla = () => {
    throw new DOMException("Acceso denegado", "SecurityError");
  };
  return {
    get length() {
      return falla();
    },
    clear: falla,
    getItem: falla,
    key: falla,
    removeItem: falla,
    setItem: falla,
  } as unknown as Storage;
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("preferencias del teleprompter", () => {
  it("usa los valores por defecto de la página actual", () => {
    expect(PREFERENCIAS_POR_DEFECTO).toEqual({
      ritmo: 150,
      letra: 52,
      leccion: null,
      micro: "",
      vistaCamara: "guion",
      tamPrevia: 440,
    });
    expect(leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it("lee y guarda en localStorage con su clave", () => {
    guardarPreferencias({ ritmo: 165, leccion: { curso: "curso-ficticio", numero: 4 } });

    expect(CLAVE_PREFERENCIAS).toBe("teleprompter-preferencias");
    expect(JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) ?? "{}")).toMatchObject({
      ritmo: 165,
      leccion: { curso: "curso-ficticio", numero: 4 },
    });
    expect(leerPreferencias()).toMatchObject({
      ritmo: 165,
      letra: 52,
      leccion: { curso: "curso-ficticio", numero: 4 },
    });
  });

  it("devuelve el mismo objeto mientras no cambie lo guardado", () => {
    guardarPreferencias({ letra: 60 });
    expect(leerPreferencias()).toBe(leerPreferencias());
  });

  it("avisa a los suscriptores al guardar", () => {
    const aviso = vi.fn();
    const cancelar = suscribirPreferencias(aviso);

    guardarPreferencias({ micro: "micro-ficticio" });
    cancelar();
    guardarPreferencias({ micro: "" });

    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it("descarta valores fuera de rango o con forma incorrecta", () => {
    expect(
      normalizarPreferencias({
        ritmo: 999,
        letra: "grande",
        leccion: { curso: "../fuera", numero: 4 },
        micro: 7,
        vistaCamara: "otra",
        tamPrevia: 500,
      }),
    ).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(normalizarPreferencias({ ritmo: 152, letra: 41, tamPrevia: 0 })).toMatchObject({
      ritmo: 150,
      letra: 42,
      tamPrevia: 0,
    });
    expect(normalizarPreferencias("no es un objeto")).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it("ignora un JSON roto", () => {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, "{roto");
    expect(leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
  });

  it("sigue funcionando con localStorage caído (lanza al acceder)", () => {
    vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new DOMException("Acceso denegado", "SecurityError");
    });

    expect(() => leerPreferencias()).not.toThrow();
    expect(leerPreferencias()).toMatchObject({ ritmo: 150 });
    expect(() => guardarPreferencias({ ritmo: 180 })).not.toThrow();
    expect(leerPreferencias()).toMatchObject({ ritmo: 180 });
  });

  it("sigue funcionando si getItem y setItem lanzan", () => {
    vi.spyOn(window, "localStorage", "get").mockReturnValue(almacenCaido());

    expect(() => guardarPreferencias({ letra: 70 })).not.toThrow();
    expect(leerPreferencias()).toMatchObject({ letra: 70 });
  });
});
