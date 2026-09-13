import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/profile";
import ProgressChart, { ExerciseSeries } from "@/components/ProgressChart";
import {
  bodyweightKgFromProfile,
  comparableLoad,
  dominantUnit,
  estimate1RM,
  parseReps,
  parseWeight,
} from "@/lib/weight";

export default async function ProgressPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [plan, dbUser] = await Promise.all([
    prisma.plan.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: {
        sessions: {
          orderBy: { order: "asc" },
          include: {
            exercises: {
              orderBy: { order: "asc" },
              include: {
                logs: {
                  where: { userId: user.id },
                  include: { sets: { orderBy: { setIndex: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { profile: true } }),
  ]);

  if (!plan) {
    return (
      <p className="mt-24 text-center text-sm text-ink-2">
        Sin plan activo todavía.
      </p>
    );
  }

  // El peso corporal del perfil es lo que permite graficar dominadas y fondos:
  // sin él, "BW" no tiene número y esos ejercicios desaparecían del progreso —
  // justo los del principiante, que es quien más necesita verse avanzar.
  const profile = parseProfile(dbUser?.profile);
  const bodyweightKg = bodyweightKgFromProfile(profile.peso);

  // Una sola unidad para todo el gráfico, deducida de lo que el atleta escribe.
  // El eje decía "kg" fijo aunque el bloque entero estuviera en libras.
  const allWeights: (string | null)[] = [];
  const planWeights: (string | null)[] = [];
  for (const s of plan.sessions) {
    for (const ex of s.exercises) {
      planWeights.push(ex.startWeight);
      for (const log of ex.logs) for (const set of log.sets) allWeights.push(set.weight);
    }
  }
  const unit = dominantUnit(allWeights, planWeights);

  const series: ExerciseSeries[] = [];
  let hidBodyweight = false;

  for (const session of plan.sessions) {
    for (const ex of session.exercises) {
      const points: ExerciseSeries["points"] = [];
      let best: { label: string; score: number } | null = null;
      let exerciseHidBw = false;

      for (const log of [...ex.logs].sort((a, b) => a.week - b.week)) {
        let maxLoad: number | null = null;
        let est1rm: number | null = null;

        for (const set of log.sets) {
          const parsed = parseWeight(set.weight);
          const load = comparableLoad(parsed, unit, bodyweightKg);
          if (load === null) {
            // Peso corporal sin peso en el perfil: no se inventa un número.
            if (parsed.bodyweight) exerciseHidBw = true;
            continue;
          }
          maxLoad = Math.max(maxLoad ?? 0, load);

          const reps = parseReps(set.reps);
          if (reps === null) continue;
          const e = estimate1RM(load, reps);
          if (e === null) continue;
          est1rm = Math.max(est1rm ?? 0, e);
          if (!best || e > best.score) {
            best = {
              label: `${set.reps}×${set.weight ?? Math.round(load)} · S${log.week}`,
              score: e,
            };
          }
        }

        if (maxLoad !== null) {
          points.push({
            week: log.week,
            maxWeight: Math.round(maxLoad * 10) / 10,
            est1rm: est1rm !== null ? Math.round(est1rm * 10) / 10 : null,
          });
        }
      }

      if (exerciseHidBw && points.length === 0) hidBodyweight = true;
      if (points.length > 0) {
        series.push({
          id: ex.id,
          name: ex.name,
          session: session.name,
          prBaseline: ex.prBaseline,
          best: best?.label ?? null,
          points,
        });
      }
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Progreso</h1>
      {series.length === 0 ? (
        <p className="mt-12 text-center text-sm text-ink-2">
          Loggeá algunas sesiones para ver tu progresión acá.
        </p>
      ) : (
        <>
          <ProgressChart series={series} unit={unit} />
          {hidBodyweight && (
            <p className="rounded-lg border border-line bg-card px-4 py-3 text-xs leading-relaxed text-ink-2">
              Tenés ejercicios de peso corporal (dominadas, fondos, flexiones) que no
              se pueden graficar sin saber cuánto pesás. Poné tu peso en{" "}
              <a href="/settings" className="text-volt underline-offset-4 hover:underline">
                Ajustes → Perfil
              </a>{" "}
              y aparecen acá.
            </p>
          )}
        </>
      )}
    </div>
  );
}
