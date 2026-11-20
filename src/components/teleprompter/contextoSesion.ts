import type { RefObject } from "react";

import type { useLectura } from "@/components/teleprompter/useLectura";
import type { Pendiente, useSesionGrabacion } from "@/components/teleprompter/useSesionGrabacion";
import type {
  EscenaTeleprompter,
  Montaje,
  Teleprompter as DatosTeleprompter,
} from "@/lib/tipos";

// Lo que ven las acciones de la sesión (arrancar, parar, cambiar de escena, editar…): los
// valores del render en el que se crean, como los closures del componente.
export type ContextoSesion = {
  escenas: EscenaTeleprompter[];
  indice: number;
  escena: EscenaTeleprompter | undefined;
  voz: boolean;
  editando: boolean;
  enMarcha: boolean;
  ocupado: boolean;
  bloqueado: boolean;
  pendientes: Pendiente[];
  montaje: Montaje | null;
  lectura: ReturnType<typeof useLectura>;
  sesion: ReturnType<typeof useSesionGrabacion>;
  setIndice: (indice: number) => void;
  setEstado: (estado: string | null) => void;
  setEditando: (editando: boolean) => void;
  setGuion: (guion: DatosTeleprompter) => void;
  prompterRef: RefObject<HTMLDivElement | null>;
  relojRef: RefObject<HTMLSpanElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  bucleTomaRef: RefObject<number>;
  // Si la zona de entrega tiene una subida en curso (cambiar de lección la cortaría).
  subiendoTomasRef: RefObject<boolean>;
  alCambiarLeccion: (valor: string) => void;
};
