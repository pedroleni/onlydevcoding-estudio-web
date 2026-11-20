import type { ContextoSesion } from "@/components/teleprompter/contextoSesion";
import type { EventoToma } from "@/components/teleprompter/PieControles";
import { colocarVideo, seguirToma } from "@/components/teleprompter/sincroniaPrevia";
import { ponerTexto } from "@/components/teleprompter/useLectura";

export const escenaMontajeDe = (ctx: ContextoSesion, id: string | undefined) =>
  ctx.montaje?.escenas.find((candidata) => candidata.id === id);

// ---------- vista previa ----------
export function colocarPrevia(ctx: ContextoSesion, id: string | undefined) {
  if (ctx.montaje) colocarVideo(ctx.videoRef.current, escenaMontajeDe(ctx, id), ctx.montaje.fps);
}

export function alEventoToma(ctx: ContextoSesion, audio: HTMLAudioElement, evento: EventoToma) {
  cancelAnimationFrame(ctx.bucleTomaRef.current);
  const escenaMontaje = escenaMontajeDe(ctx, ctx.escena?.id);
  const { montaje } = ctx;
  if (!montaje || !escenaMontaje) return;
  const acompanar = () => {
    if (!ctx.lectura.enMarchaAhora()) {
      seguirToma(ctx.videoRef.current, audio, escenaMontaje, montaje.fps);
    }
  };
  if (evento === "parada") {
    acompanar();
    return;
  }
  const paso = () => {
    acompanar();
    if (!audio.paused) ctx.bucleTomaRef.current = requestAnimationFrame(paso);
  };
  paso();
}

// ---------- teleprompter ----------
export function pararTodo(ctx: ContextoSesion, limpiar: boolean) {
  ctx.lectura.pararTodo(limpiar);
  ctx.videoRef.current?.pause();
}

export function mostrarEscena(ctx: ContextoSesion, i: number) {
  const { escenas } = ctx;
  if (escenas.length === 0) return;
  pararTodo(ctx, true);
  cancelAnimationFrame(ctx.bucleTomaRef.current);
  const nuevo = Math.max(0, Math.min(escenas.length - 1, i));
  ctx.setIndice(nuevo);
  ctx.setEstado(null);
  ponerTexto(ctx.relojRef.current, "0:00");
  ctx.prompterRef.current?.scrollTo?.({ top: 0, behavior: "instant" });
  colocarPrevia(ctx, escenas[nuevo].id);
}
