import { describe, expect, it } from "vitest";

import {
  avanceCurso,
  contarLeccion,
  plural,
  rangoNumeros,
  totalesPublicacion,
} from "@/lib/estadisticas-publicacion";
import type {
  EstadoLeccion,
  EstadoRed,
  PiezaVista,
  RedVista,
  VistaPublicacion,
} from "@/lib/tipos";

function red(
  id: RedVista["red"],
  estado: EstadoRed["estado"] = "pendiente",
  conTextos = true,
): RedVista {
  return {
    red: id,
    textos: conTextos
      ? {
          titulos: ["t"],
          descripcion: null,
          etiquetas: [],
          texto: null,
          comentario_fijado: null,
          ajustes: [],
          video: null,
          notas: null,
        }
      : null,
    estado: {
      estado,
      fecha: estado === "pendiente" ? null : "2026-11-18T19:43:20+01:00",
      url: estado === "publicado" ? "https://youtu.be/abc" : null,
    },
  };
}

function pieza(parcial: Partial<PiezaVista>): PiezaVista {
  return {
    id: "leccion",
    tipo: "leccion",
    titulo: "Lección completa",
    video: "publicar/leccion.mp4",
    duracion: null,
    fecha_propuesta: null,
    portadas: [],
    portada_elegida: null,
    redes: [],
    ...parcial,
  };
}

function vista(numero: number, piezas: PiezaVista[]): VistaPublicacion {
  return {
    curso: "react",
    numero,
    piezas,
    despues_de_publicar: [],
    notas: null,
    error: null,
    guia: null,
    aviso: null,
  };
}

function estado(parcial: Partial<EstadoLeccion>): EstadoLeccion {
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

describe("contarLeccion", () => {
  it("separa lo pendiente de lo subido en las redes en que se publica cada pieza", () => {
    const leccion = contarLeccion(
      1,
      "¿Qué problema resuelve React?",
      vista(1, [
        pieza({
          redes: [
            red("youtube", "publicado"),
            red("instagram", "pendiente", false),
            red("tiktok", "pendiente", false),
            red("linkedin"),
          ],
        }),
        pieza({
          id: "short-2",
          tipo: "short",
          titulo: "Short 2",
          redes: [
            red("youtube", "programado"),
            red("instagram", "publicado"),
            red("tiktok", "publicado"),
            red("linkedin", "pendiente", false),
          ],
        }),
      ]),
    );

    expect(leccion.pendientes).toBe(2);
    expect(leccion.subidas).toBe(3);
    expect(leccion.total).toBe(5);
    expect(leccion.piezas.map((p) => p.pendientes.map(({ red: r }) => r))).toEqual([
      ["linkedin"],
      ["youtube"],
    ]);
    expect(leccion.piezas[1].subidas.map(({ red: r }) => r)).toEqual([
      "instagram",
      "tiktok",
    ]);
  });

  it("cuenta por defecto las redes de una pieza con vídeo pero sin textos", () => {
    const leccion = contarLeccion(
      6,
      "Las llaves",
      vista(6, [
        pieza({ redes: [red("youtube", "pendiente", false)] }),
        pieza({ id: "reel-salida", tipo: "reel", titulo: "Reel", redes: [] }),
      ]),
    );

    expect(leccion.pendientes).toBe(5);
    expect(leccion.subidas).toBe(0);
  });

  it("no cuenta una pieza sin vídeo ni textos (lección aún sin preparar)", () => {
    const leccion = contarLeccion(
      7,
      "Sin preparar",
      vista(7, [pieza({ video: null, redes: [red("youtube", "pendiente", false)] })]),
    );

    expect(leccion.piezas).toEqual([]);
    expect(leccion.total).toBe(0);
  });

  it("trata una vista que no llegó como lección sin nada que contar", () => {
    expect(contarLeccion(3, "Sin datos", null)).toMatchObject({
      numero: 3,
      titulo: "Sin datos",
      piezas: [],
      pendientes: 0,
      subidas: 0,
      total: 0,
    });
  });
});

describe("totalesPublicacion", () => {
  it("suma lo que queda y lo subido, con lo que queda por red en orden fijo", () => {
    const a = contarLeccion(
      1,
      "A",
      vista(1, [pieza({ redes: [red("youtube", "publicado"), red("linkedin")] })]),
    );
    const b = contarLeccion(
      2,
      "B",
      vista(2, [
        pieza({
          id: "short-1",
          tipo: "short",
          titulo: "S",
          redes: [red("youtube"), red("instagram"), red("tiktok", "publicado")],
        }),
      ]),
    );

    expect(totalesPublicacion([a, b])).toEqual({
      quedan: 3,
      subidas: 2,
      quedanPorRed: [
        { red: "youtube", nombre: "YouTube", quedan: 1 },
        { red: "instagram", nombre: "Instagram", quedan: 1 },
        { red: "tiktok", nombre: "TikTok", quedan: 0 },
        { red: "linkedin", nombre: "LinkedIn", quedan: 1 },
      ],
    });
  });
});

describe("avanceCurso", () => {
  const terminada = {
    numero: 4,
    estado: estado({
      voz: { hechas: 13, total: 13 },
      camara: { hechas: 3, total: 3 },
      video_final: true,
    }),
    publicacion: { subidas: 4, total: 4 },
  };
  const aMedias = {
    numero: 5,
    estado: estado({
      voz: { hechas: 15, total: 15 },
      camara: { hechas: 3, total: 3 },
      video_final: true,
    }),
    publicacion: { subidas: 2, total: 5 },
  };
  const sinEmpezar = {
    numero: 7,
    estado: estado({}),
    publicacion: { subidas: 0, total: 0 },
  };

  it("da a cada lección cuatro pasos del mismo peso y al curso la media de sus lecciones", () => {
    const avance = avanceCurso([terminada, aMedias, sinEmpezar]);

    expect(avance.porLeccion).toEqual([
      { numero: 4, porcentaje: 100 },
      { numero: 5, porcentaje: 85 },
      { numero: 7, porcentaje: 0 },
    ]);
    // (100 + 85 + 0) / 3 = 61,67 → 61 hecho, 39 por hacer
    expect(avance.porcentaje).toBe(61);
    expect(avance.queda).toBe(39);
    expect(avance.terminadas).toBe(1);
    expect(avance.lecciones).toBe(3);
    expect(avance.pasos).toEqual([
      { paso: "Voz", porcentaje: 66 },
      { paso: "Cámara", porcentaje: 66 },
      { paso: "Vídeo final", porcentaje: 66 },
      { paso: "Publicación", porcentaje: 46 },
    ]);
  });

  it("no redondea a 100 una lección a la que aún le falta algo", () => {
    const casi = {
      numero: 2,
      estado: estado({
        voz: { hechas: 16, total: 16 },
        camara: { hechas: 3, total: 3 },
        video_final: true,
      }),
      publicacion: { subidas: 199, total: 200 },
    };

    const avance = avanceCurso([casi]);
    expect(avance.porLeccion[0].porcentaje).toBe(99);
    expect(avance.terminadas).toBe(0);
  });

  it("da por hecho un paso de grabación sin escenas, salvo que no haya guion", () => {
    const sinCamara = {
      numero: 1,
      estado: estado({
        voz: { hechas: 4, total: 4 },
        camara: { hechas: 0, total: 0 },
        video_final: true,
      }),
      publicacion: { subidas: 1, total: 1 },
    };
    const sinGuion = {
      numero: 2,
      estado: estado({
        guion: false,
        voz: { hechas: 0, total: 0 },
        camara: { hechas: 0, total: 0 },
      }),
      publicacion: { subidas: 0, total: 0 },
    };

    expect(avanceCurso([sinCamara, sinGuion]).porLeccion).toEqual([
      { numero: 1, porcentaje: 100 },
      { numero: 2, porcentaje: 0 },
    ]);
  });

  it("deja el curso a cero si no tiene lecciones", () => {
    expect(avanceCurso([])).toMatchObject({ porcentaje: 0, queda: 100, lecciones: 0 });
  });
});

describe("plural y rangoNumeros", () => {
  it("concuerda el número con el singular o el plural", () => {
    expect(plural(1, "subida", "subidas")).toBe("1 subida");
    expect(plural(13, "subida", "subidas")).toBe("13 subidas");
    expect(plural(0, "subida", "subidas")).toBe("0 subidas");
  });

  it("junta los números seguidos en tramos", () => {
    expect(rangoNumeros([7, 8, 9, 10, 11, 12])).toBe("7–12");
    expect(rangoNumeros([3])).toBe("3");
    expect(rangoNumeros([3, 7, 8, 9])).toBe("3 y 7–9");
    expect(rangoNumeros([1, 3, 5])).toBe("1, 3 y 5");
    expect(rangoNumeros([4, 5])).toBe("4 y 5");
  });
});
