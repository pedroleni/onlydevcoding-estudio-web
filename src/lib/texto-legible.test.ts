import { describe, expect, it } from "vitest";

import { textoLegible } from "@/lib/texto-legible";

describe("textoLegible", () => {
  it.each([
    ["abre Widget punto tsx.", "abre Widget.tsx."],
    ["Aquí, Inventario punto jsx tiene uno", "Aquí, Inventario.jsx tiene uno"],
    ["los archivos punto svg", "los archivos .svg"],
    ["importa desde punto barra Brújula", "importa desde ./Brújula"],
    ["from, punto barra Brújula", "from, ./Brújula"],
    ["from, punto barra, Brújula.", "from, ./, Brújula."],
    ["por punto barra, después", "por ./, después"],
    ["Panel punto tsx,", "Panel.tsx,"],
    ["ejemplo punto com", "ejemplo.com"],
    ["manual punto dev", "manual.dev"],
    ["proyecto punto org", "proyecto.org"],
    ["dado punto random", "dado.random"],
    ["fábrica punto creaFicha", "fábrica.creaFicha"],
    ["motor punto activaLuz", "motor.activaLuz"],
    ["grupo punto toArray", "grupo.toArray"],
    ["grupo punto count", "grupo.count"],
    ["ficha punto key", "ficha.key"],
    ["robot punto title", "robot.title"],
    ["elementos punto length", "elementos.length"],
    ["registro punto log", "registro.log"],
    ["lienzo punto render", "lienzo.render"],
    ["reloj punto now", "reloj.now"],
    ["herramienta punto config", "herramienta.config"],
    ["ajustes punto config punto ts", "ajustes.config.ts"],
    ["package Punto json", "package.json"],
    ["Cada punto es", "Cada punto es"],
    ["hasta este punto todo bien", "hasta este punto todo bien"],
    ["Llegamos al punto clave", "Llegamos al punto clave"],
    ["El tercer punto importante", "El tercer punto importante"],
    ["en ese punto barra algo", "en ese punto barra algo"],
    ["diecinueve punto tres", "diecinueve punto tres"],
    ["el punto de partida", "el punto de partida"],
    ["un punto y aparte", "un punto y aparte"],
    ["usas punto y coma", "usas punto y coma"],
    ["Con npm run dev en marcha", "Con npm run dev en marcha"],
  ])("convierte %j en %j", (entrada, salida) => {
    expect(textoLegible(entrada)).toBe(salida);
  });
});
