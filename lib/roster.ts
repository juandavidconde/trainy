// El roster del coach: quién entrena, en qué semana va y quién se está cayendo.
//
// La lista vieja mostraba "último log: 28 jul" y nada más — un dato que no
// responde la única pregunta que importa al abrir el panel: a quién hay que
// escribirle hoy. Acá se calcula un estado por atleta y se ordena por urgencia.

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentWeek, daysSince } from "@/lib/week";

export type AthleteStatus = "sin-plan" | "al-dia" | "atrasado" | "inactivo";

export interface RosterEntry {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isSelf: boolean;
  plan: { id: string; name: string; weeks: number } | null;
  week: number | null;
  /** Sesiones distintas con registro en la semana en curso. */
  sessionsThisWeek: number;
  sessionsPerWeek: number;
  lastLog: Date | null;
  daysSinceLastLog: number | null;
  status: AthleteStatus;
}

export const STATUS_LABEL: Record<AthleteStatus, string> = {
  "sin-plan": "sin plan",
  "al-dia": "al día",
  atrasado: "atrasado",
  inactivo: "inactivo",
};

/** Orden de atención: lo roto primero. */
const STATUS_RANK: Record<AthleteStatus, number> = {
  inactivo: 0,
  atrasado: 1,
  "sin-plan": 2,
  "al-dia": 3,
};

/** Umbrales de días sin registrar. Una semana de gym tolera 2-3 días de hueco;
 *  a partir de 7 la persona ya se salió del bloque. */
const LATE_AFTER_DAYS = 3;
const INACTIVE_AFTER_DAYS = 7;

function statusFor(
  hasPlan: boolean,
  sessionsThisWeek: number,
  sessionsPerWeek: number,
  days: number | null
): AthleteStatus {
  if (!hasPlan) return "sin-plan";
  if (days === null) return "inactivo"; // nunca registró nada
  if (sessionsThisWeek >= sessionsPerWeek && sessionsPerWeek > 0) return "al-dia";
  if (days >= INACTIVE_AFTER_DAYS) return "inactivo";
  if (days >= LATE_AFTER_DAYS) return "atrasado";
  return "al-dia";
}

export async function loadRoster(selfId: string): Promise<RosterEntry[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      plans: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sessions: {
            orderBy: { order: "asc" },
            include: { exercises: { select: { id: true } } },
          },
        },
      },
    },
  });

  // Última actividad de cada quien, en una sola consulta agregada
  const activity = await prisma.workoutLog.groupBy({
    by: ["userId"],
    _max: { updatedAt: true },
  });
  const lastByUser = new Map(activity.map((a) => [a.userId, a._max.updatedAt]));

  // La semana en curso es distinta por atleta, así que se pide el par
  // (usuario, semana) exacto de cada uno en vez de traer todos los registros.
  const weekByUser = new Map<string, number>();
  for (const u of users) {
    const plan = u.plans[0];
    if (plan) weekByUser.set(u.id, currentWeek(plan.startDate, plan.weeks));
  }
  const pairs = [...weekByUser.entries()].map(([userId, week]) => ({
    userId,
    week,
  }));
  const logsThisWeek = pairs.length
    ? await prisma.workoutLog.findMany({
        where: { OR: pairs },
        select: { userId: true, exerciseId: true },
      })
    : [];

  const loggedExercisesByUser = new Map<string, Set<string>>();
  for (const l of logsThisWeek) {
    if (!loggedExercisesByUser.has(l.userId)) {
      loggedExercisesByUser.set(l.userId, new Set());
    }
    loggedExercisesByUser.get(l.userId)!.add(l.exerciseId);
  }

  const roster: RosterEntry[] = users.map((u) => {
    const plan = u.plans[0] ?? null;
    const week = weekByUser.get(u.id) ?? null;
    const logged = loggedExercisesByUser.get(u.id) ?? new Set<string>();
    const sessionsThisWeek = plan
      ? plan.sessions.filter((s) => s.exercises.some((e) => logged.has(e.id)))
          .length
      : 0;
    const sessionsPerWeek = plan?.sessions.length ?? 0;
    const lastLog = lastByUser.get(u.id) ?? null;
    const days = daysSince(lastLog);

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isSelf: u.id === selfId,
      plan: plan ? { id: plan.id, name: plan.name, weeks: plan.weeks } : null,
      week,
      sessionsThisWeek,
      sessionsPerWeek,
      lastLog,
      daysSinceLastLog: days,
      status: statusFor(!!plan, sessionsThisWeek, sessionsPerWeek, days),
    };
  });

  return roster.sort((a, b) => {
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return (a.name ?? a.email).localeCompare(b.name ?? b.email, "es");
  });
}
