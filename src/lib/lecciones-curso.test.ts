import { describe, expect, it } from "vitest";

import {
  estadoFicha,
  fichasCurso,
  filtrarFichas,
  modulosCurso,
  pasosLeccion,
} from "@/lib/lecciones-curso";
import type { EstadoLeccion, LeccionResumen } from "@/lib/tipos";

function estado(parcial: Partial<EstadoLeccion> = {}): EstadoLeccion {
  return {
    guion: true,
    voz: { hechas: 0, total: 10 },
    camara: { hechas: 0, total: 2 },
    video_final: false,
    miniatura: null,
    previa: null,
    publicado: {},
    ...parcial,
  };
}

function leccion(numero: number, titulo: string, e = estado()): LeccionResumen {
  return { curso: "react", numero, slug: `l${numero}`, titulo, estado: e };
}

const TEMARIO = [
  { numero: 1, titulo: "¿Qué problema resuelve React? Largo", modulo: "Primeros pasos" },
  { numero: 2, titulo: "Crear un proyecto con Vite", modulo: "Primeros pasos" },
  { numero: 3, titulo: "Props: pasar datos", modulo: "Describir la interfaz" },
];

describe("fichas del curso", () => {
  it("junta lo que hay en disco con el temario, con el título de disco y el módulo del temario", () => {
    const fichas = fichasCurso([leccion(1, "¿Qué problema resuelve React?"), leccion(9, "Extra")], TEMARIO);

    expect(fichas.map((f) => [f.numero, f.titulo, f.modulo, f.leccion !== null])).toEqual([
      [1, "¿Qué problema resuelve React?", "Primeros pasos", true],
      [2, "Crear un proyecto con Vite", "Primeros pasos", false],
      [3, "Props: pasar datos", "Describir la interfaz", false],
      [9, "Extra", null, true],
    ]);
    expect(modulosCurso(fichas).map((m) => m.nombre)).toEqual([
      "Primeros pasos",
      "Describir la interfaz",
      "Otras lecciones",
    ]);
  });

  it("filtra por palabras sin acentos y por número exacto", () => {
    const fichas = fichasCurso([], TEMARIO);

    expect(filtrarFichas(fichas, "que PROBLEMA", "").map((f) => f.numero)).toEqual([1]);
    expect(filtrarFichas(fichas, "interfaz", "").map((f) => f.numero)).toEqual([3]);
    expect(filtrarFichas(fichas, "", "2").map((f) => f.numero)).toEqual([2]);
    expect(filtrarFichas(fichas, "vite", "3")).toEqual([]);
    expect(filtrarFichas(fichas, "  ", " ")).toHaveLength(3);
  });

  it("calcula el estado de cada ficha con la publicación sobre 22", () => {
    const terminada = estado({
      voz: { hechas: 10, total: 10 },
      camara: { hechas: 2, total: 2 },
      video_final: true,
      publicado_avance: { youtube: { hechas: 22, total: 22 } },
    });
    const enMarcha = estado({ voz: { hechas: 3, total: 10 } });

    expect(pasosLeccion(enMarcha).voz).toBeCloseTo(0.3);
    expect(
      pasosLeccion(estado({ publicado_avance: { youtube: { hechas: 2, total: 4 } } })).publicacion,
    ).toBeCloseTo(2 / 22);
    const fichas = fichasCurso(
      [leccion(1, "a", terminada), leccion(2, "b", enMarcha), leccion(3, "c")],
      [...TEMARIO, { numero: 4, titulo: "d", modulo: null }],
    );
    expect(fichas.map(estadoFicha)).toEqual([
      "terminada",
      "en-marcha",
      "por-empezar",
      "por-preparar",
    ]);
  });
});
