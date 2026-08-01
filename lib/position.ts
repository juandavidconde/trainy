// Última posición del atleta en /today (bloque + semana + sesión).
//
// Por qué existe: /today calculaba semana y sesión desde la fecha en cada
// render, así que volver a la app (el PWA abre en /today pelado) o pasar por
// Historial y volver te sacaba del entrenamiento en curso. La posición se
// guarda en una cookie desde el cliente y se lee en el servidor cuando la URL
// no trae parámetros.
//
// La cookie NO es httpOnly a propósito: la escribe el cliente sin round-trip
// al servidor, y no contiene nada sensible (un id de plan y una semana).

export const POSITION_COOKIE = "trainy_pos";

/**
 * Ventana en la que la posición guardada se considera "el entrenamiento en
 * curso". Pasada esa ventana, /today vuelve a arrancar en la sesión de hoy —
 * que es lo correcto al día siguiente.
 */
export const POSITION_TTL_MS = 6 * 60 * 60 * 1000;

const MAX_AGE_S = 60 * 60 * 24 * 30;

export interface Position {
  planId: string;
  week: number;
  session: string;
  /** Epoch ms del cliente. Se compara contra el reloj del servidor: la ventana
   *  de 6 h absorbe cualquier desfase razonable. */
  ts: number;
}

export function parsePosition(raw: string | undefined | null): Position | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(decodeURIComponent(raw));
    if (
      p &&
      typeof p.planId === "string" &&
      typeof p.session === "string" &&
      Number.isInteger(p.week) &&
      typeof p.ts === "number"
    ) {
      return p as Position;
    }
  } catch {
    // cookie corrupta o de una versión vieja → se ignora
  }
  return null;
}

/** `document.cookie = positionCookie({...})` */
export function positionCookie(p: Position): string {
  const value = encodeURIComponent(JSON.stringify(p));
  const secure =
    typeof location !== "undefined" && location.protocol === "https:"
      ? "; secure"
      : "";
  return `${POSITION_COOKIE}=${value}; path=/; max-age=${MAX_AGE_S}; samesite=lax${secure}`;
}

/** Cookie de borrado, para cuando el plan se reinicia o se cambia. */
export const POSITION_COOKIE_CLEARED = `${POSITION_COOKIE}=; path=/; max-age=0`;

export function isFresh(p: Position | null, planId: string): p is Position {
  return (
    !!p && p.planId === planId && Date.now() - p.ts < POSITION_TTL_MS
  );
}
