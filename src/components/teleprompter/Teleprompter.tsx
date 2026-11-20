"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  SelectorLeccion,
  valorLeccion,
  type OpcionLeccion,
} from "@/components/teleprompter/BarraAjustes";
import { Mensaje } from "@/components/teleprompter/Mensaje";
import { SesionTeleprompter } from "@/components/teleprompter/SesionTeleprompter";
import { guardarPreferencias, leerPreferencias } from "@/lib/teleprompter/preferencias";
import type { EstadoAccion, Teleprompter as DatosTeleprompter } from "@/lib/tipos";

export type { OpcionLeccion };

type Seleccion = { curso: string; numero: number };

const urlTeleprompter = ({ curso, numero }: Seleccion) =>
  `/teleprompter?curso=${encodeURIComponent(curso)}&leccion=${numero}`;

export function Teleprompter({
  datos,
  lecciones,
  seleccion,
  acciones = null,
}: {
  datos: DatosTeleprompter | null;
  lecciones: OpcionLeccion[];
  seleccion: Seleccion | null;
  // Estado de las acciones de la lección, para que la zona de entrega siga lo que esté en marcha.
  acciones?: EstadoAccion[] | null;
}) {
  const router = useRouter();
  const curso = datos?.curso;
  const numero = datos?.numero;

  // Sin lección en la URL: la última usada o, si no, la primera con guion.
  useEffect(() => {
    if (seleccion || lecciones.length === 0) return;
    const guardada = leerPreferencias().leccion;
    const destino =
      (guardada &&
        lecciones.find(
          (opcion) => opcion.curso === guardada.curso && opcion.numero === guardada.numero,
        )) ||
      lecciones[0];
    router.replace(urlTeleprompter(destino));
  }, [seleccion, lecciones, router]);

  useEffect(() => {
    if (curso !== undefined && numero !== undefined) {
      guardarPreferencias({ leccion: { curso, numero } });
    }
  }, [curso, numero]);

  const cambiarLeccion = (valor: string) => {
    const opcion = lecciones.find((candidata) => valorLeccion(candidata) === valor);
    if (opcion) router.push(urlTeleprompter(opcion));
  };

  if (!datos) {
    if (!seleccion) {
      return (
        <div className="py-8 md:py-12">
          <Mensaje>
            {lecciones.length === 0 ? "Aún no hay ninguna lección con guion." : "Cargando…"}
          </Mensaje>
        </div>
      );
    }
    return (
      <div className="grid gap-6 py-8 md:py-12">
        <SelectorLeccion
          lecciones={lecciones}
          leccion={valorLeccion(seleccion)}
          alCambiarLeccion={cambiarLeccion}
        />
        <Mensaje>Esta lección aún no tiene guion</Mensaje>
      </div>
    );
  }

  return (
    <SesionTeleprompter
      key={valorLeccion(datos)}
      datos={datos}
      lecciones={lecciones}
      acciones={acciones}
      alCambiarLeccion={cambiarLeccion}
    />
  );
}
