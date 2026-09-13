/**
 * Qué sesión te toca hoy, cuando no hay días fijos.
 *
 * El calendario del plan ("Lunes: UPPER, Domingo: DESCANSO") asume que la
 * semana de la persona se parece a la semana que imaginó el coach. Cuando no
 * —un domingo libre, un lunes de viaje, un miércoles con reunión— la app
 * declaraba día de descanso y trataba de "desviado" a quien estaba parado en
 * el gym listo para entrenar.
 *
 * En modo flexible el criterio deja de ser el día y pasa a ser el progreso:
 * te toca la primera sesión del ciclo que todavía no hiciste esta semana.
 * Terminada la vuelta, el ciclo vuelve a empezar.
 */

export type SessionLike = { id: string; name: string; order: number };

/**
 * La siguiente sesión pendiente del ciclo.
 *
 * `doneIds` son las sesiones con al menos una serie registrada en la semana
 * en curso. Se respeta el orden del plan porque ese orden ya codifica la
 * recuperación que diseñó el coach (no poner LEGS justo después de LOWER).
 *
 * Si ya se hicieron todas, devuelve la primera: la semana está completa y
 * cualquier trabajo extra arranca de nuevo por el principio.
 */
export function nextPendingSession<T extends SessionLike>(
  sessions: T[],
  doneIds: Set<string>
): { session: T; weekComplete: boolean } | null {
  if (sessions.length === 0) return null;
  const ordered = [...sessions].sort((a, b) => a.order - b.order);
  const pending = ordered.find((s) => !doneIds.has(s.id));
  return pending
    ? { session: pending, weekComplete: false }
    : { session: ordered[0], weekComplete: true };
}

/**
 * Cuántas sesiones del ciclo quedan por hacer esta semana.
 * Alimenta el "te faltan 2" del banner, que es la única cifra que la persona
 * necesita para decidir si entrena hoy.
 */
export function remainingCount(
  sessions: SessionLike[],
  doneIds: Set<string>
): number {
  return sessions.filter((s) => !doneIds.has(s.id)).length;
}
