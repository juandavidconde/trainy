import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import ProgressChart, { ExerciseSeries } from "@/components/ProgressChart";

function num(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/[\d.]+/);
  if (!m) return null;
  const v = parseFloat(m[0]);
  return Number.isFinite(v) ? v : null;
}

export default async function ProgressPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
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
  });

  if (!plan) {
    return (
      <p className="mt-24 text-center text-sm text-neutral-400">
        Sin plan activo todavía.
      </p>
    );
  }

  const series: ExerciseSeries[] = [];
  for (const session of plan.sessions) {
    for (const ex of session.exercises) {
      const points: ExerciseSeries["points"] = [];
      let best: { label: string; score: number } | null = null;

      for (const log of ex.logs.sort((a, b) => a.week - b.week)) {
        let maxWeight: number | null = null;
        let est1rm: number | null = null;
        for (const set of log.sets) {
          const w = num(set.weight);
          const r = num(set.reps);
          if (w === null) continue;
          maxWeight = Math.max(maxWeight ?? 0, w);
          if (r !== null && r > 0) {
            const e = w * (1 + r / 30);
            est1rm = Math.max(est1rm ?? 0, e);
            if (!best || e > best.score) {
              best = { label: `${set.reps}×${set.weight} · S${log.week}`, score: e };
            }
          }
        }
        if (maxWeight !== null) {
          points.push({
            week: log.week,
            maxWeight,
            est1rm: est1rm !== null ? Math.round(est1rm * 10) / 10 : null,
          });
        }
      }

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
        <p className="mt-12 text-center text-sm text-neutral-400">
          Loggeá algunas sesiones para ver tu progresión acá.
        </p>
      ) : (
        <ProgressChart series={series} />
      )}
    </div>
  );
}
