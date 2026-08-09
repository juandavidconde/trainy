// Cuenta de semanas del bloque. Vive acá porque la usan /today, Ajustes y el
// panel del coach, y si se desincronizan cada pantalla dice una semana distinta.

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Semana en curso del bloque, 1-indexed y acotada al largo del bloque. */
export function currentWeek(startDate: Date | null, weeks: number): number {
  if (!startDate) return 1;
  return clamp(weeksElapsed(startDate), 1, weeks);
}

/**
 * Semanas transcurridas desde el arranque, SIN acotar. `currentWeek` está
 * clampeada al largo del bloque, así que un bloque terminado hace dos meses y
 * uno que termina hoy devuelven lo mismo (S12) y son indistinguibles: por eso
 * la app mostraba S12 para siempre sin darse cuenta de que el bloque cerró.
 */
export function weeksElapsed(startDate: Date | null): number {
  if (!startDate) return 1;
  return Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
}

/**
 * Fecha de arranque que deja al atleta en la semana `week` a partir de hoy.
 * Se usa para retomar donde quedó tras una pausa sin que tenga que hacer la
 * cuenta a mano en Ajustes.
 */
export function startDateForWeek(week: number): Date {
  const d = todayAtNoonUtc();
  d.setUTCDate(d.getUTCDate() - (Math.max(1, week) - 1) * 7);
  return d;
}

/** `YYYY-MM-DD` de un Date, para los inputs de fecha y `saveStartDate`. */
export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * `YYYY-MM-DD` anclado al mediodía UTC. Sin el ancla, una fecha elegida en
 * Bogotá (UTC-5) cae el día anterior en UTC y la semana se corre uno.
 */
export function dateAtNoonUtc(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso ?? "").trim());
  if (!m) return null;
  const d = new Date(
    Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Semana que daría una fecha de inicio dada, para previsualizar en la UI. */
export function weekFromIso(iso: string, weeks: number): number | null {
  const d = dateAtNoonUtc(iso);
  return d ? currentWeek(d, weeks) : null;
}

/** Hoy a mediodía UTC — el arranque que se usa al reiniciar un bloque. */
export function todayAtNoonUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12)
  );
}

export function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (24 * 3600 * 1000));
}
