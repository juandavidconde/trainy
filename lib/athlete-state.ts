// Estado real de un atleta dentro de su bloque.
//
// Tres preguntas que la app no sabía contestar y que rompían el ciclo:
//   1. ¿Todavía no empezó?      → el día 0 caía en "hoy toca DESCANSO"
//   2. ¿Estuvo fuera un tiempo? → volvía a S9 con los pesos de S9, sin aviso
//   3. ¿Ya terminó el bloque?   → S12 congelada para siempre, sin cierre
//
// Todo se calcula acá para que /today, el panel del coach y los recordatorios
// digan exactamente lo mismo. Cuando cada pantalla lo calculaba por su cuenta,
// un bloque vencido aparecía "AL DÍA" en el roster.

import type { Plan, WorkoutLog } from "@prisma/client";
import { currentWeek, weeksElapsed } from "@/lib/week";

/** Días sin registrar a partir de los cuales se ofrece retomar. */
export const PAUSE_AFTER_DAYS = 10;

export type BlockPhase = "sin-empezar" | "en-curso" | "ultima-semana" | "terminado";

export interface AthleteState {
  phase: BlockPhase;
  /** Semana que la app muestra (acotada al largo del bloque). */
  week: number;
  /** Semanas transcurridas desde el arranque, sin acotar. */
  elapsed: number;
  /** Última semana con algún registro, o null si nunca entrenó. */
  lastLoggedWeek: number | null;
  /** Fecha del último entrenamiento (la del registro, no la de edición). */
  lastTrainedAt: Date | null;
  daysSinceLastTraining: number | null;
  /** Volvió tras una pausa y la app lo dejaría en una semana adelantada. */
  pausedGap: {
    /** Días sin entrenar. `null` si el historial vino importado y no trae fecha. */
    days: number | null;
    /** Semanas del bloque que quedaron sin registro. */
    weeks: number;
    /** Semana donde tiene sentido retomar: la siguiente a la última registrada. */
    resumeWeek: number;
  } | null;
  /** Sesiones distintas con registro en la semana en curso. */
  sessionsThisWeek: number;
  sessionsPerWeek: number;
}

type LogLike = Pick<WorkoutLog, "week" | "date" | "updatedAt" | "exerciseId">;
type PlanLike = Pick<Plan, "startDate" | "weeks"> & {
  sessions: { exercises: { id: string }[] }[];
};

function daysBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 3600 * 1000));
}

/**
 * Fase del bloque. Vive suelta para que el panel del coach —que trabaja con
 * consultas agregadas, no con la lista entera de registros— aplique EXACTAMENTE
 * el mismo criterio que /today. Cuando cada pantalla tenía el suyo, un bloque
 * vencido hacía dos semanas figuraba "al día" en el roster.
 */
export function blockPhaseFrom(opts: {
  elapsed: number;
  weeks: number;
  lastLoggedWeek: number | null;
}): BlockPhase {
  if (opts.elapsed > opts.weeks) return "terminado";
  if (opts.lastLoggedWeek === null) return "sin-empezar";
  if (opts.elapsed === opts.weeks) return "ultima-semana";
  return "en-curso";
}

export function computeAthleteState(plan: PlanLike, logs: LogLike[]): AthleteState {
  const week = currentWeek(plan.startDate, plan.weeks);
  const elapsed = weeksElapsed(plan.startDate);
  const sessionsPerWeek = plan.sessions.length;

  const withData = logs.filter((l) => l.week > 0);
  const lastLoggedWeek = withData.length
    ? Math.max(...withData.map((l) => l.week))
    : null;

  // La fecha del entrenamiento, no la de modificación: un historial importado
  // hoy no significa que la persona haya entrenado hoy. El roster usaba
  // updatedAt y por eso los atletas retro-datados aparecían "registró hoy".
  const dates = withData
    .map((l) => l.date ?? null)
    .filter((d): d is Date => d instanceof Date);
  const lastTrainedAt = dates.length
    ? new Date(Math.max(...dates.map((d) => d.getTime())))
    : null;
  const daysSinceLastTraining = lastTrainedAt
    ? Math.max(0, daysBetween(lastTrainedAt, new Date()))
    : null;

  const exercisesThisWeek = new Set(
    logs.filter((l) => l.week === week).map((l) => l.exerciseId)
  );
  const sessionsThisWeek = plan.sessions.filter((s) =>
    s.exercises.some((e) => exercisesThisWeek.has(e.id))
  ).length;

  const phase = blockPhaseFrom({ elapsed, weeks: plan.weeks, lastLoggedWeek });

  // Solo se ofrece retomar si la pausa realmente lo dejó atrás: si estuvo fuera
  // pero la semana que le toca es la que sigue a la última que registró, no hay
  // nada que corregir.
  //
  // La señal primaria es la BRECHA DE SEMANAS, no los días. El historial que el
  // coach importa desde el skill llega sin fecha de entrenamiento (`date` queda
  // en null), así que apoyarse solo en los días dejaba fuera justo a los
  // atletas con coach — que son la mayoría. Que la app te ponga en S9 con tu
  // último registro en S4 ya es evidencia suficiente de que estuviste afuera.
  const resumeWeek = lastLoggedWeek !== null ? Math.min(lastLoggedWeek + 1, plan.weeks) : 1;
  const weekGap = lastLoggedWeek !== null ? week - resumeWeek : 0;
  const outOfSync =
    weekGap >= 1 ||
    (daysSinceLastTraining !== null && daysSinceLastTraining >= PAUSE_AFTER_DAYS);
  const pausedGap =
    phase !== "terminado" && lastLoggedWeek !== null && week > resumeWeek && outOfSync
      ? {
          // Sin fecha real se informa la brecha en semanas, que sí es cierta.
          days: daysSinceLastTraining,
          weeks: weekGap,
          resumeWeek,
        }
      : null;

  return {
    phase,
    week,
    elapsed,
    lastLoggedWeek,
    lastTrainedAt,
    daysSinceLastTraining,
    pausedGap,
    sessionsThisWeek,
    sessionsPerWeek,
  };
}
