// El roster del coach: quién entrena, en qué semana va y quién se está cayendo.
//
// La lista vieja mostraba "último log: 28 jul" y nada más — un dato que no
// responde la única pregunta que importa al abrir el panel: a quién hay que
// escribirle hoy. Acá se calcula un estado por atleta y se ordena por urgencia.
//
// Dos correcciones sobre la versión anterior:
//   · "registró hoy" salía de updatedAt, la fecha en que la FILA se tocó. Un
//     historial importado o un plan re-publicado hacía aparecer activo a quien
//     no entrenaba hace semanas. Ahora se usa la fecha del entrenamiento.
//   · Un bloque terminado figuraba "al día" — el estado que más necesita ver el
//     coach (hay que renovarlo) no existía.

import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentWeek, weeksElapsed } from "@/lib/week";
import { blockPhaseFrom, type BlockPhase } from "@/lib/athlete-state";
import { classifyComment, SIGNAL_LABEL, SIGNAL_RANK, type SignalKind } from "@/lib/signals";

export type AthleteStatus =
  | "sin-plan"
  | "al-dia"
  | "atrasado"
  | "inactivo"
  | "bloque-terminado";

export interface RosterEntry {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isSelf: boolean;
  /** Registró algo alguna vez, tenga o no fecha de entrenamiento. */
  hasLogs: boolean;
  plan: { id: string; name: string; weeks: number } | null;
  week: number | null;
  phase: BlockPhase | null;
  /** Sesiones distintas con registro en la semana en curso. */
  sessionsThisWeek: number;
  sessionsPerWeek: number;
  lastLog: Date | null;
  daysSinceLastLog: number | null;
  status: AthleteStatus;
  /** Lo peor que anotó en las últimas semanas: dolor, molestia, serie cortada. */
  signal: { kind: SignalKind; text: string; week: number } | null;
}

export const STATUS_LABEL: Record<AthleteStatus, string> = {
  "sin-plan": "sin plan",
  "al-dia": "al día",
  atrasado: "atrasado",
  inactivo: "inactivo",
  "bloque-terminado": "bloque terminado",
};

/** Orden de atención: lo roto primero. */
const STATUS_RANK: Record<AthleteStatus, number> = {
  "bloque-terminado": 0,
  inactivo: 1,
  atrasado: 2,
  "sin-plan": 3,
  "al-dia": 4,
};

/** Umbrales de días sin registrar. Una semana de gym tolera 2-3 días de hueco;
 *  a partir de 7 la persona ya se salió del bloque. */
const LATE_AFTER_DAYS = 3;
const INACTIVE_AFTER_DAYS = 7;

/** Cuántas semanas atrás se miran los comentarios en busca de señales. */
const SIGNAL_WINDOW_WEEKS = 3;

function statusFor(
  phase: BlockPhase | null,
  sessionsThisWeek: number,
  sessionsPerWeek: number,
  days: number | null,
  hasLogs: boolean
): AthleteStatus {
  if (phase === null) return "sin-plan";
  // Terminó el bloque: eso manda sobre cualquier otra lectura. Es la única
  // señal que pide una acción concreta del coach (publicarle el siguiente).
  if (phase === "terminado") return "bloque-terminado";
  if (!hasLogs) return "inactivo"; // nunca registró nada
  if (sessionsThisWeek >= sessionsPerWeek && sessionsPerWeek > 0) return "al-dia";
  // Historial importado por el coach: hay registros pero sin fecha de
  // entrenamiento, así que no se puede afirmar cuántos días lleva. Se juzga
  // solo por lo que hizo esta semana en vez de inventar una antigüedad.
  if (days === null) return sessionsThisWeek > 0 ? "al-dia" : "atrasado";
  if (days >= INACTIVE_AFTER_DAYS) return "inactivo";
  if (days >= LATE_AFTER_DAYS) return "atrasado";
  return "al-dia";
}

function daysSinceDate(date: Date | null): number | null {
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (24 * 3600 * 1000)));
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

  // Último entrenamiento y última semana registrada, en dos agregados.
  // `date` es cuándo entrenó; `updatedAt` es cuándo se tocó la fila.
  const activity = await prisma.workoutLog.groupBy({
    by: ["userId"],
    _max: { date: true, week: true },
  });
  const lastByUser = new Map(activity.map((a) => [a.userId, a._max.date]));
  const lastWeekByUser = new Map(activity.map((a) => [a.userId, a._max.week]));

  // La semana en curso es distinta por atleta, así que se pide el par
  // (usuario, semana) exacto de cada uno en vez de traer todos los registros.
  const weekByUser = new Map<string, number>();
  const elapsedByUser = new Map<string, number>();
  for (const u of users) {
    const plan = u.plans[0];
    if (!plan) continue;
    weekByUser.set(u.id, currentWeek(plan.startDate, plan.weeks));
    elapsedByUser.set(u.id, weeksElapsed(plan.startDate));
  }
  const pairs = [...weekByUser.entries()].map(([userId, week]) => ({ userId, week }));
  const logsThisWeek = pairs.length
    ? await prisma.workoutLog.findMany({
        where: { OR: pairs },
        select: { userId: true, exerciseId: true },
      })
    : [];

  // Comentarios recientes con contenido, solo para buscar señales. Se filtra en
  // la consulta para no traer el historial entero de la instancia.
  const signalPairs = [...weekByUser.entries()].map(([userId, week]) => ({
    userId,
    week: { gte: Math.max(1, week - SIGNAL_WINDOW_WEEKS) },
    comment: { not: null },
  }));
  const commented = signalPairs.length
    ? await prisma.workoutLog.findMany({
        where: { OR: signalPairs },
        select: { userId: true, week: true, comment: true },
        orderBy: { week: "desc" },
      })
    : [];

  const signalByUser = new Map<string, RosterEntry["signal"]>();
  for (const log of commented) {
    const kind = classifyComment(log.comment);
    if (!kind) continue;
    const current = signalByUser.get(log.userId);
    if (
      !current ||
      SIGNAL_RANK[kind] < SIGNAL_RANK[current.kind] ||
      (SIGNAL_RANK[kind] === SIGNAL_RANK[current.kind] && log.week > current.week)
    ) {
      signalByUser.set(log.userId, {
        kind,
        text: (log.comment ?? "").trim(),
        week: log.week,
      });
    }
  }

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
      ? plan.sessions.filter((s) => s.exercises.some((e) => logged.has(e.id))).length
      : 0;
    const sessionsPerWeek = plan?.sessions.length ?? 0;
    const lastLog = lastByUser.get(u.id) ?? null;
    const days = daysSinceDate(lastLog ?? null);
    const hasLogs = (lastWeekByUser.get(u.id) ?? null) !== null;
    const phase = plan
      ? blockPhaseFrom({
          elapsed: elapsedByUser.get(u.id) ?? 1,
          weeks: plan.weeks,
          lastLoggedWeek: lastWeekByUser.get(u.id) ?? null,
        })
      : null;

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isSelf: u.id === selfId,
      hasLogs,
      plan: plan ? { id: plan.id, name: plan.name, weeks: plan.weeks } : null,
      week,
      phase,
      sessionsThisWeek,
      sessionsPerWeek,
      lastLog: lastLog ?? null,
      daysSinceLastLog: days,
      status: statusFor(phase, sessionsThisWeek, sessionsPerWeek, days, hasLogs),
      signal: signalByUser.get(u.id) ?? null,
    };
  });

  return roster.sort((a, b) => {
    // Una señal de dolor sube al atleta por encima de su estado: es lo único
    // del panel que puede terminar en una lesión.
    const sa = a.signal ? 0 : 1;
    const sb = b.signal ? 0 : 1;
    if (sa !== sb) return sa - sb;
    const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (r !== 0) return r;
    return (a.name ?? a.email).localeCompare(b.name ?? b.email, "es");
  });
}

export { SIGNAL_LABEL };
