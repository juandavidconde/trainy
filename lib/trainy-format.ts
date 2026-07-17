import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// Formato Trainy: tipos del plan.json y tracker_*.json que
// genera el skill. La app importa/exporta estos formatos tal
// cual para que el skill siga siendo el coach.
// ─────────────────────────────────────────────────────────────

export interface TrainyExercise {
  nombre: string;
  progresion?: string;
  peso_s1?: string;
  tempo?: string;
  notas?: string;
}

export interface TrainySession {
  color?: string;
  dia?: string;
  subtitulo?: string;
  ejercicios: TrainyExercise[];
}

export interface TrainyPlanJson {
  usuario?: string;
  nombre_bloque: string;
  objetivo?: string;
  fecha_inicio?: string;
  dias_semana?: number;
  tiempo_sesion?: string;
  split?: string;
  semanas?: number;
  descargas?: number[];
  calendario?: Record<string, string>;
  sesiones: Record<string, TrainySession>;
  prs?: { ejercicio: string; pr?: string; peso_s1?: string; sesion?: string }[];
}

export interface TrainySet {
  reps?: string;
  weight?: string;
  rpe?: string;
  done?: boolean;
}

/** tracker JSON: data[sesión][semana][índiceEjercicio] = { sets, comment } */
export interface TrainyTrackerJson {
  data: Record<
    string,
    Record<string, Record<string, { sets?: TrainySet[]; comment?: string }>>
  >;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Los PRs del plan.json usan nombres abreviados — match difuso por sesión + inclusión. */
function findPrBaseline(
  prs: TrainyPlanJson["prs"],
  sessionName: string,
  exerciseName: string
): string | null {
  if (!prs) return null;
  const ex = norm(exerciseName);
  for (const pr of prs) {
    if (pr.sesion && norm(pr.sesion) !== norm(sessionName)) continue;
    const prName = norm(pr.ejercicio);
    if (ex.includes(prName) || prName.includes(ex)) {
      return pr.pr && pr.pr !== "n/a" ? pr.pr : null;
    }
  }
  return null;
}

/**
 * Importa un plan.json del skill como bloque nuevo del usuario.
 * Los planes activos previos pasan a ARCHIVED (solo hay un bloque vivo).
 */
export async function importPlan(userId: string, plan: TrainyPlanJson) {
  if (!plan?.nombre_bloque || !plan?.sesiones) {
    throw new Error("plan.json inválido: faltan nombre_bloque o sesiones");
  }

  return prisma.$transaction(async (tx) => {
    await tx.plan.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "ARCHIVED" },
    });

    const created = await tx.plan.create({
      data: {
        userId,
        name: plan.nombre_bloque,
        objective: plan.objetivo ?? null,
        split: plan.split ?? null,
        startDate: plan.fecha_inicio ? new Date(plan.fecha_inicio) : null,
        daysPerWeek: plan.dias_semana ?? null,
        sessionTime: plan.tiempo_sesion ?? null,
        weeks: plan.semanas ?? 12,
        deloadWeeks: plan.descargas ?? [],
        calendar: (plan.calendario ?? undefined) as Prisma.InputJsonValue,
        sourceJson: plan as unknown as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
    });

    let sOrder = 0;
    for (const [name, s] of Object.entries(plan.sesiones)) {
      await tx.planSession.create({
        data: {
          planId: created.id,
          name,
          color: s.color ?? null,
          dayOfWeek: s.dia ?? null,
          subtitle: s.subtitulo ?? null,
          order: sOrder++,
          exercises: {
            create: s.ejercicios.map((e, i) => ({
              name: e.nombre,
              progression: e.progresion ?? null,
              startWeight: e.peso_s1 ?? null,
              tempo: e.tempo ?? null,
              notes: e.notas ?? null,
              prBaseline: findPrBaseline(plan.prs, name, e.nombre),
              order: i,
            })),
          },
        },
      });
    }

    return created;
  });
}

/**
 * Importa un tracker_*.json (logs históricos) sobre un plan existente.
 * Mapea por nombre de sesión + índice de ejercicio (mismo orden que el plan).
 */
export async function importTracker(
  userId: string,
  planId: string,
  tracker: TrainyTrackerJson
) {
  if (!tracker?.data) throw new Error("tracker inválido: falta data");

  const planSessions = await prisma.planSession.findMany({
    where: { planId },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  const byName = new Map(planSessions.map((s) => [norm(s.name), s]));

  let logsWritten = 0;
  const skipped: string[] = [];

  for (const [sessionName, weeks] of Object.entries(tracker.data)) {
    const session = byName.get(norm(sessionName));
    if (!session) {
      skipped.push(`sesión "${sessionName}" no existe en el plan`);
      continue;
    }
    for (const [weekStr, exercises] of Object.entries(weeks)) {
      const week = parseInt(weekStr, 10);
      if (!Number.isFinite(week)) continue;
      for (const [exIdxStr, entry] of Object.entries(exercises)) {
        const exIdx = parseInt(exIdxStr, 10);
        const exercise = session.exercises[exIdx];
        if (!exercise) {
          skipped.push(`"${sessionName}" S${week} ejercicio #${exIdx} fuera de rango`);
          continue;
        }
        const sets = (entry.sets ?? []).filter(
          (s) => s.done || s.reps || s.weight || s.rpe
        );
        if (sets.length === 0 && !entry.comment) continue;

        const log = await prisma.workoutLog.upsert({
          where: {
            userId_exerciseId_week: { userId, exerciseId: exercise.id, week },
          },
          create: {
            userId,
            exerciseId: exercise.id,
            week,
            comment: entry.comment || null,
          },
          update: { comment: entry.comment || null },
        });
        await prisma.setLog.deleteMany({ where: { logId: log.id } });
        await prisma.setLog.createMany({
          data: sets.map((s, i) => ({
            logId: log.id,
            setIndex: i,
            reps: s.reps ?? null,
            weight: s.weight ?? null,
            rpe: s.rpe ?? null,
            done: !!s.done,
          })),
        });
        logsWritten++;
      }
    }
  }

  return { logsWritten, skipped };
}

/** Exporta los logs de un plan en el formato tracker_*.json que el skill sabe leer. */
export async function exportTracker(
  userId: string,
  planId: string
): Promise<TrainyTrackerJson> {
  const sessions = await prisma.planSession.findMany({
    where: { planId },
    orderBy: { order: "asc" },
    include: {
      exercises: {
        orderBy: { order: "asc" },
        include: {
          logs: { where: { userId }, include: { sets: { orderBy: { setIndex: "asc" } } } },
        },
      },
    },
  });

  const data: TrainyTrackerJson["data"] = {};
  for (const session of sessions) {
    const sessionData: TrainyTrackerJson["data"][string] = {};
    session.exercises.forEach((exercise, exIdx) => {
      for (const log of exercise.logs) {
        const weekKey = String(log.week);
        sessionData[weekKey] ??= {};
        sessionData[weekKey][String(exIdx)] = {
          sets: log.sets.map((s) => ({
            reps: s.reps ?? "",
            weight: s.weight ?? "",
            rpe: s.rpe ?? "",
            done: s.done,
          })),
          comment: log.comment ?? "",
        };
      }
    });
    if (Object.keys(sessionData).length > 0) data[session.name] = sessionData;
  }
  return { data };
}
