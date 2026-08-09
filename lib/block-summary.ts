// Resumen de un bloque terminado: lo que el atleta consiguió en 12 semanas.
//
// Es el único momento del ciclo en que existe evidencia acumulada de que el
// producto funcionó, y era el momento en que la app se quedaba muda: mostraba
// S12 congelada, sin cierre, sin PRs y sin ruta al bloque siguiente.

import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/profile";
import {
  bodyweightKgFromProfile,
  comparableLoad,
  dominantUnit,
  estimate1RM,
  formatLoad,
  parseReps,
  parseWeight,
  type Unit,
} from "@/lib/weight";

export interface ExerciseGain {
  name: string;
  sessionName: string;
  /** Mejor serie del bloque, tal como la escribió el atleta. */
  best: string;
  bestWeek: number;
  /** Ganancia de e1RM entre la primera semana registrada y la mejor, en %. */
  gainPct: number | null;
  firstLabel: string | null;
  firstWeek: number | null;
}

export interface BlockSummary {
  planId: string;
  planName: string;
  weeks: number;
  unit: Unit;
  /** Sesiones distintas efectivamente registradas. */
  sessionsDone: number;
  /** Sesiones que el bloque planificaba (semanas × sesiones por semana). */
  sessionsPlanned: number;
  adherencePct: number;
  weeksTrained: number;
  totalSets: number;
  gains: ExerciseGain[];
  /** Ejercicios que mejoraron, ordenados por ganancia. */
  topGains: ExerciseGain[];
}

export async function buildBlockSummary(
  userId: string,
  planId?: string
): Promise<BlockSummary | null> {
  const plan = await prisma.plan.findFirst({
    where: planId ? { id: planId, userId } : { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: {
          exercises: {
            orderBy: { order: "asc" },
            include: {
              logs: {
                where: { userId },
                include: { sets: { orderBy: { setIndex: "asc" } } },
                orderBy: { week: "asc" },
              },
            },
          },
        },
      },
    },
  });
  if (!plan) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { profile: true },
  });
  const bodyweightKg = bodyweightKgFromProfile(parseProfile(dbUser?.profile).peso);

  const allWeights: (string | null)[] = [];
  const planWeights: (string | null)[] = [];
  for (const s of plan.sessions) {
    for (const ex of s.exercises) {
      planWeights.push(ex.startWeight);
      for (const log of ex.logs) {
        for (const set of log.sets) allWeights.push(set.weight);
      }
    }
  }
  const unit = dominantUnit(allWeights, planWeights);

  const gains: ExerciseGain[] = [];
  const weeksWithData = new Set<number>();
  const sessionWeekPairs = new Set<string>();
  let totalSets = 0;

  for (const session of plan.sessions) {
    for (const ex of session.exercises) {
      let best: { score: number; label: string; week: number } | null = null;
      let first: { score: number; label: string; week: number } | null = null;

      for (const log of ex.logs) {
        if (log.sets.length === 0) continue;
        weeksWithData.add(log.week);
        sessionWeekPairs.add(`${session.id}:${log.week}`);

        for (const set of log.sets) {
          totalSets += set.done ? 1 : 0;
          const reps = parseReps(set.reps);
          const load = comparableLoad(parseWeight(set.weight), unit, bodyweightKg);
          if (reps === null || load === null) continue;
          const score = estimate1RM(load, reps);
          if (score === null) continue;
          const label = `${reps}×${set.weight ?? formatLoad(load, unit)}`;
          if (!best || score > best.score) best = { score, label, week: log.week };
          // "Primera" = la primera semana con una serie medible, no la S1 a secas:
          // si arrancó a registrar en S3, la referencia honesta es S3.
          if (!first || log.week < first.week) first = { score, label, week: log.week };
        }
      }

      if (!best) continue;
      const gainPct =
        first && first.week !== best.week && first.score > 0
          ? ((best.score - first.score) / first.score) * 100
          : null;
      gains.push({
        name: ex.name,
        sessionName: session.name,
        best: best.label,
        bestWeek: best.week,
        gainPct,
        firstLabel: first?.label ?? null,
        firstWeek: first?.week ?? null,
      });
    }
  }

  const sessionsPerWeek = plan.sessions.length;
  const sessionsPlanned = sessionsPerWeek * plan.weeks;
  const sessionsDone = sessionWeekPairs.size;

  return {
    planId: plan.id,
    planName: plan.name,
    weeks: plan.weeks,
    unit,
    sessionsDone,
    sessionsPlanned,
    adherencePct: sessionsPlanned > 0 ? (sessionsDone / sessionsPlanned) * 100 : 0,
    weeksTrained: weeksWithData.size,
    totalSets,
    gains,
    topGains: gains
      .filter((g) => g.gainPct !== null && g.gainPct > 0)
      .sort((a, b) => (b.gainPct ?? 0) - (a.gainPct ?? 0))
      .slice(0, 5),
  };
}
