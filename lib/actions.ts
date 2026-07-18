"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/auth";
import { AthleteProfile, serializeProfile } from "@/lib/profile";

export interface SetInput {
  reps: string;
  weight: string;
  rpe: string;
  done: boolean;
}

export async function saveLog(
  exerciseId: string,
  week: number,
  sets: SetInput[],
  comment: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: { session: { include: { plan: true } } },
  });
  if (!exercise) return { ok: false, error: "Ejercicio no encontrado" };
  if (exercise.session.plan.userId !== user.id) {
    return { ok: false, error: "No autorizado" };
  }
  if (!Number.isInteger(week) || week < 1 || week > 52) {
    return { ok: false, error: "Semana inválida" };
  }

  const cleaned = sets
    .map((s) => ({
      reps: (s.reps ?? "").trim(),
      weight: (s.weight ?? "").trim(),
      rpe: (s.rpe ?? "").trim(),
      done: !!s.done,
    }))
    .filter((s) => s.done || s.reps || s.weight || s.rpe);

  const log = await prisma.workoutLog.upsert({
    where: { userId_exerciseId_week: { userId: user.id, exerciseId, week } },
    create: {
      userId: user.id,
      exerciseId,
      week,
      comment: comment?.trim() || null,
      date: new Date(),
    },
    update: { comment: comment?.trim() || null, date: new Date() },
  });

  await prisma.setLog.deleteMany({ where: { logId: log.id } });
  if (cleaned.length > 0) {
    await prisma.setLog.createMany({
      data: cleaned.map((s, i) => ({
        logId: log.id,
        setIndex: i,
        reps: s.reps || null,
        weight: s.weight || null,
        rpe: s.rpe || null,
        done: s.done,
      })),
    });
  }

  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/progress");
  return { ok: true };
}

export async function saveName(
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const clean = (name ?? "").trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Nombre vacío" };
  await prisma.user.update({ where: { id: user.id }, data: { name: clean } });
  return { ok: true };
}

export async function saveProfile(
  profile: AthleteProfile
): Promise<{ ok: boolean; error?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };
  await prisma.user.update({
    where: { id: user.id },
    data: { profile: serializeProfile(profile ?? {}) },
  });
  revalidatePath("/ai");
  return { ok: true };
}
