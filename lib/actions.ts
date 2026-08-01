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

  // Las filas se guardan EN SU POSICIÓN. Antes se filtraban las vacías y se
  // reindexaba desde 0: si llenabas la serie 1 y la 3, al volver aparecían
  // como 1 y 2 — las series se desordenaban solas. Ahora solo se recortan las
  // vacías del final (que son ruido de la grilla, no huecos del atleta).
  const rows = sets.map((s) => ({
    reps: (s.reps ?? "").trim(),
    weight: (s.weight ?? "").trim(),
    rpe: (s.rpe ?? "").trim(),
    done: !!s.done,
  }));
  const hasData = (s: (typeof rows)[number]) =>
    s.done || !!s.reps || !!s.weight || !!s.rpe;
  let lastWithData = -1;
  rows.forEach((s, i) => {
    if (hasData(s)) lastWithData = i;
  });
  const cleaned = rows.slice(0, lastWithData + 1);

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

  // Sin revalidatePath a propósito. El autosave corre cada 2.5 s mientras el
  // atleta escribe; revalidar /today re-renderizaba la página entera debajo de
  // sus dedos (tarjetas que se reacomodan, scroll que salta). /today,
  // /history y /progress son rutas dinámicas (leen la sesión), y el router
  // cache de Next 15 no reusa dinámicas por defecto (staleTimes.dynamic = 0),
  // así que al navegar ya se piden frescas. Si alguna vez se sube ese valor en
  // next.config, hay que volver a revalidar /history y /progress acá.
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
  revalidatePath("/settings");
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
  revalidatePath("/settings");
  return { ok: true };
}
