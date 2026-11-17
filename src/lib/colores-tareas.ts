import type { TipoTarea } from "@/lib/tipos";

// La misma lista cerrada que valida la API (estudio_api/tareas.py).
export const COLORES_TAREA: readonly { valor: TipoTarea["color"]; nombre: string }[] = [
  { valor: "#299BC6", nombre: "Azul" },
  { valor: "#4BC98C", nombre: "Verde" },
  { valor: "#E8A33D", nombre: "Ámbar" },
  { valor: "#E5534B", nombre: "Rojo" },
  { valor: "#A371F7", nombre: "Violeta" },
  { valor: "#6CCBEF", nombre: "Celeste" },
  { valor: "#F778BA", nombre: "Rosa" },
  { valor: "#9B9BA4", nombre: "Gris" },
];
