import { mostrarEscena, pararTodo } from "@/components/teleprompter/accionesEscena";
import type { ContextoSesion } from "@/components/teleprompter/contextoSesion";
import { ponerTexto } from "@/components/teleprompter/useLectura";
import { guardarPreferencias, leerPreferencias } from "@/lib/teleprompter/preferencias";
import type { Teleprompter as DatosTeleprompter } from "@/lib/tipos";

// ---------- ajustes ----------
export function cambiarRitmo(ctx: ContextoSesion, ritmo: number) {
  guardarPreferencias({ ritmo });
  if (!ctx.enMarcha && !ctx.editando) mostrarEscena(ctx, ctx.indice);
}

export function cambiarVista(ctx: ContextoSesion) {
  if (ctx.editando) return;
  guardarPreferencias({
    vistaCamara: leerPreferencias().vistaCamara === "puntos" ? "guion" : "puntos",
  });
  mostrarEscena(ctx, ctx.indice);
}

export function cambiarLeccion(ctx: ContextoSesion, valor: string) {
  if (ctx.bloqueado) return;
  if (ctx.pendientes.length > 0 && !window.confirm("Hay una toma sin guardar. ¿Descartarla?")) {
    return;
  }
  if (
    ctx.subiendoTomasRef.current &&
    !window.confirm("Hay una subida de tomas en curso. ¿Cortarla y cambiar de lección?")
  ) {
    return;
  }
  ctx.alCambiarLeccion(valor);
}

// ---------- edición del texto ----------
export function editar(ctx: ContextoSesion) {
  if (!ctx.escena || ctx.lectura.enMarchaAhora() || ctx.sesion.guardandoAhora()) return;
  pararTodo(ctx, true);
  ctx.setEditando(true);
  ctx.setEstado("Corrige el texto y pulsa Guardar texto.");
  ctx.prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
}

export function alGuardarTexto(ctx: ContextoSesion, nuevo: DatosTeleprompter) {
  ctx.setGuion(nuevo);
  ctx.setEditando(false);
  ctx.setEstado("Texto guardado en el guion.");
  ponerTexto(ctx.relojRef.current, "0:00");
  ctx.prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
}

export function cancelarEdicion(ctx: ContextoSesion) {
  ctx.setEditando(false);
  mostrarEscena(ctx, ctx.indice);
}
