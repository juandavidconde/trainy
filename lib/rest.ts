// Duración del descanso entre series. Vive en localStorage: es una preferencia
// del dispositivo, no dato de entrenamiento — no vale una columna en la base.

export const REST_KEY = "trainy:rest";

export interface RestPrefs {
  /** Descanso tras un básico (COMPOUND), en segundos. */
  compound: number;
  /** Descanso tras el resto de ejercicios, en segundos. */
  other: number;
}

export const REST_DEFAULT: RestPrefs = { compound: 150, other: 90 };

const MIN_S = 15;
const MAX_S = 600;

function clampSeconds(n: unknown, fallback: number): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(Math.max(v, MIN_S), MAX_S);
}

export function readRest(): RestPrefs {
  if (typeof localStorage === "undefined") return REST_DEFAULT;
  try {
    const raw = localStorage.getItem(REST_KEY);
    if (!raw) return REST_DEFAULT;
    const p = JSON.parse(raw);
    return {
      compound: clampSeconds(p?.compound, REST_DEFAULT.compound),
      other: clampSeconds(p?.other, REST_DEFAULT.other),
    };
  } catch {
    return REST_DEFAULT;
  }
}

export function writeRest(p: RestPrefs): RestPrefs {
  const clean: RestPrefs = {
    compound: clampSeconds(p.compound, REST_DEFAULT.compound),
    other: clampSeconds(p.other, REST_DEFAULT.other),
  };
  try {
    localStorage.setItem(REST_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent("trainy:rest-changed", { detail: clean }));
  } catch {
    // modo privado / storage lleno → se queda con el default de la sesión
  }
  return clean;
}

export function formatSeconds(s: number): string {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
