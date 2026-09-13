"use client";

// Cola de registros pendientes de subir.
//
// El autosave escribía directo al servidor: si la conexión se cortaba entre
// series —lo normal en un gimnasio de sótano— la serie se perdía en silencio y
// el atleta no se enteraba hasta que volvía a mirar la pantalla. Ahora lo que
// no se pudo guardar queda en el teléfono y se sube apenas vuelve la señal.

import type { SetInput } from "@/lib/actions";

const KEY = "trainy:pending-logs:v1";
const MAX_ITEMS = 200;

export interface PendingLog {
  exerciseId: string;
  week: number;
  sets: SetInput[];
  comment: string;
  /** Momento del intento, para quedarnos con el más reciente de cada ejercicio. */
  at: number;
}

type SaveFn = (
  exerciseId: string,
  week: number,
  sets: SetInput[],
  comment: string
) => Promise<{ ok: boolean; error?: string }>;

function read(): PendingLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingLog[]) : [];
  } catch {
    return [];
  }
}

function write(items: PendingLog[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage lleno o modo privado: no hay red de seguridad, pero nada se rompe */
  }
}

/** Encola un guardado fallido. Una entrada por (ejercicio, semana): la última gana. */
export function enqueue(item: Omit<PendingLog, "at">): void {
  const items = read().filter(
    (p) => !(p.exerciseId === item.exerciseId && p.week === item.week)
  );
  items.push({ ...item, at: Date.now() });
  write(items);
}

export function pendingCount(): number {
  return read().length;
}

/** Sube lo pendiente. Devuelve cuántos quedaron sin subir. */
export async function flush(save: SaveFn): Promise<number> {
  const items = read();
  if (items.length === 0) return 0;

  const failed: PendingLog[] = [];
  for (const item of items) {
    try {
      const res = await save(item.exerciseId, item.week, item.sets, item.comment);
      // Un error del servidor (ejercicio borrado, semana inválida) no se
      // reintenta para siempre: se descarta. Solo se conserva lo que falló por red.
      if (!res.ok && /red|network|fetch/i.test(res.error ?? "")) failed.push(item);
    } catch {
      failed.push(item);
    }
  }
  write(failed);
  return failed.length;
}

/** Corre `onChange` cuando vuelve la conexión, para que la UI reaccione. */
export function onReconnect(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
