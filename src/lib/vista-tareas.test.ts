import { describe, expect, it } from "vitest";

import type { Curso, TareaVista, TipoTarea } from "@/lib/tipos";
import {
  COLOR_DESCONOCIDO,
  agruparDia,
  colorSeguro,
  etiquetaEnlace,
  filtrarTareas,
  hrefEnlace,
  hrefTareas,
  leerParametrosTareas,
} from "@/lib/vista-tareas";

const HOY = "2026-11-17";

function tarea(parcial: Partial<TareaVista> & { id: number }): TareaVista {
  return {
    fecha: HOY,
    hora: null,
    texto: `Tarea ${parcial.id}`,
    tipo: "grabar",
    hecha: false,
    hecha_en: null,
    enlace: null,
    enlace_vista: null,
    ...parcial,
  };
}

const tipos: TipoTarea[] = [
  { id: "preparar", nombre: "Preparar", color: "#A371F7", orden: 1 },
  { id: "grabar", nombre: "Grabar", color: "#E5534B", orden: 2 },
  { id: "publicar", nombre: "Publicar", color: "#4BC98C", orden: 4 },
];

const cursos: Curso[] = [
  { id: "react", nombre: "React", carpeta: "cursos/REACT", lecciones: 12, en_disco: true },
  { id: "python", nombre: "Python", carpeta: null, lecciones: 0, en_disco: false },
];

describe("leerParametrosTareas", () => {
  it("usa los valores por defecto sin parámetros", () => {
    expect(leerParametrosTareas({}, HOY)).toEqual({
      vista: "dia",
      dia: HOY,
      curso: null,
      tipo: null,
    });
  });

  it.each([
    [{ vista: "mes" }, { vista: "dia" }],
    [{ vista: "semana" }, { vista: "semana" }],
    [{ dia: "2026-02-29" }, { dia: HOY }],
    [{ dia: "2028-02-29" }, { dia: "2028-02-29" }],
    [{ curso: "../x" }, { curso: null }],
    [{ curso: "sin-curso" }, { curso: "sin-curso" }],
    [{ curso: "react" }, { curso: "react" }],
    [{ tipo: "Grabar" }, { tipo: null }],
    [{ tipo: "grabar" }, { tipo: "grabar" }],
    [{ dia: ["2026-11-18", "2026-11-19"] }, { dia: "2026-11-18" }],
  ])("lee %j", (entrada, esperado) => {
    expect(leerParametrosTareas(entrada, HOY)).toMatchObject(esperado);
  });
});

describe("agruparDia", () => {
  it("ordena cursos, tipos y horas", () => {
    const grupos = agruparDia(
      [
        tarea({ id: 1, tipo: "publicar", enlace: { curso: "react" } }),
        tarea({ id: 2, tipo: "grabar", enlace: { curso: "react" } }),
        tarea({ id: 3, tipo: "grabar", hora: "09:00", enlace: { curso: "react" } }),
        tarea({ id: 4, tipo: "preparar" }),
        tarea({ id: 5, tipo: "preparar", enlace: { curso: "python" } }),
      ],
      cursos,
      tipos,
    );

    expect(grupos.map((grupo) => grupo.nombre)).toEqual(["React", "Python", "Sin curso"]);
    expect(grupos[0].tipos.map(({ tipo }) => tipo.id)).toEqual(["grabar", "publicar"]);
    expect(grupos[0].tipos[0].tareas.map(({ id }) => id)).toEqual([3, 2]);
    expect(grupos[2].curso).toBeNull();
  });

  it("no pierde tareas de un curso o un tipo que ya no existen", () => {
    const grupos = agruparDia(
      [tarea({ id: 1, tipo: "borrado", enlace: { curso: "viejo" } })],
      cursos,
      tipos,
    );

    expect(grupos).toHaveLength(1);
    expect(grupos[0].nombre).toBe("viejo");
    expect(grupos[0].tipos[0].tipo).toMatchObject({ id: "borrado", nombre: "borrado" });
    expect(grupos[0].tipos[0].tareas).toHaveLength(1);
  });
});

describe("filtrarTareas", () => {
  const lista = [
    tarea({ id: 1, tipo: "grabar", enlace: { curso: "react" } }),
    tarea({ id: 2, tipo: "publicar", enlace: { curso: "react" } }),
    tarea({ id: 3, tipo: "grabar" }),
  ];

  it("filtra por curso, por tipo y por las que no tienen curso", () => {
    expect(filtrarTareas(lista, "react", null).map(({ id }) => id)).toEqual([1, 2]);
    expect(filtrarTareas(lista, null, "grabar").map(({ id }) => id)).toEqual([1, 3]);
    expect(filtrarTareas(lista, "sin-curso", null).map(({ id }) => id)).toEqual([3]);
    expect(filtrarTareas(lista, null, null)).toHaveLength(3);
  });
});

describe("hrefEnlace", () => {
  it.each([
    [
      { curso: "react", numero: 4, pieza: "reel-salida", red: "instagram" as const },
      "/cursos/react/4?pestana=publicar&pieza=reel-salida&red=instagram",
    ],
    [
      { curso: "react", numero: 4, pieza: "leccion" },
      "/cursos/react/4?pestana=publicar&pieza=leccion",
    ],
    [{ curso: "react", numero: 4 }, "/cursos/react/4"],
    [{ curso: "react" }, "/cursos/react"],
  ])("enlaza %j", (enlace, esperado) => {
    expect(hrefEnlace(tarea({ id: 1, enlace }))).toBe(esperado);
  });

  it("no enlaza sin enlace ni con el enlace roto", () => {
    expect(hrefEnlace(tarea({ id: 1 }))).toBeNull();
    expect(
      hrefEnlace(
        tarea({
          id: 2,
          enlace: { curso: "react", numero: 4 },
          enlace_vista: {
            curso_nombre: "React",
            leccion_titulo: null,
            pieza_titulo: null,
            roto: true,
          },
        }),
      ),
    ).toBeNull();
  });
});

describe("etiquetaEnlace", () => {
  it("describe lección, pieza y red", () => {
    expect(
      etiquetaEnlace(
        tarea({
          id: 1,
          enlace: { curso: "react", numero: 4, pieza: "reel-salida", red: "instagram" },
          enlace_vista: {
            curso_nombre: "React",
            leccion_titulo: "Importar",
            pieza_titulo: "Reel de salida",
            roto: false,
          },
        }),
      ),
    ).toBe("Lección 4 · Reel de salida · Instagram");
  });

  it("usa el nombre del curso si solo enlaza el curso", () => {
    expect(
      etiquetaEnlace(
        tarea({
          id: 1,
          enlace: { curso: "python" },
          enlace_vista: { curso_nombre: "Python", leccion_titulo: null, pieza_titulo: null, roto: false },
        }),
      ),
    ).toBe("Python");
  });
});

describe("endurecimiento", () => {
  it("ignora una semana que se sale del calendario", () => {
    expect(leerParametrosTareas({ vista: "semana", dia: "9999-12-31" }, HOY).dia).toBe(HOY);
    expect(leerParametrosTareas({ vista: "dia", dia: "9999-12-31" }, HOY).dia).toBe("9999-12-31");
  });

  it("no enlaza con un número de lección o un curso que no son válidos", () => {
    expect(
      hrefEnlace(tarea({ id: 1, enlace: { curso: "react", numero: "//evil.example/x" as unknown as number } })),
    ).toBeNull();
    expect(hrefEnlace(tarea({ id: 2, enlace: { curso: "react", numero: 1000 } }))).toBeNull();
    expect(hrefEnlace(tarea({ id: 3, enlace: { curso: "../x" } }))).toBeNull();
  });

  it("solo acepta colores de la lista cerrada", () => {
    expect(colorSeguro("#E5534B")).toBe("#E5534B");
    expect(colorSeguro("red;background-image:url(http://evil.example/t)")).toBe(COLOR_DESCONOCIDO);
    const grupos = agruparDia(
      [tarea({ id: 1, tipo: "raro" })],
      [],
      [{ id: "raro", nombre: "Raro", color: "red;x:y" as TipoTarea["color"], orden: 1 }],
    );
    expect(grupos[0].tipos[0].tipo.color).toBe(COLOR_DESCONOCIDO);
  });
});

describe("hrefTareas", () => {
  it("conserva los filtros al cambiar de día", () => {
    expect(
      hrefTareas({ vista: "dia", dia: HOY, curso: "react", tipo: null }, { dia: "2026-11-18" }),
    ).toBe("/tareas?vista=dia&dia=2026-11-18&curso=react");
  });
});
