import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionColor, sessionChipStyle } from "@/lib/brand";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  if (!plan || plan.sessions.length === 0) {
    return (
      <p className="mt-24 text-center text-sm text-ink-2">
        Sin plan activo todavía.
      </p>
    );
  }

  const selected =
    plan.sessions.find((s) => s.name === sp.session) ?? plan.sessions[0];

  const logs = await prisma.workoutLog.findMany({
    where: {
      userId: user.id,
      exerciseId: { in: selected.exercises.map((e) => e.id) },
    },
    include: { sets: { orderBy: { setIndex: "asc" } } },
  });

  const weeks = [...new Set(logs.map((l) => l.week))].sort((a, b) => b - a);
  const byWeekExercise = new Map(logs.map((l) => [`${l.week}:${l.exerciseId}`, l]));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Historial</h1>

      <div className="scrollbar-hide flex gap-1.5 overflow-x-auto">
        {plan.sessions.map((s) => {
          const active = s.id === selected.id;
          const color = sessionColor(s.name, s.color);
          return (
            <Link
              key={s.id}
              href={`/history?session=${encodeURIComponent(s.name)}`}
              className={`flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border px-3.5 font-display text-[13px] font-bold uppercase tracking-widest ${
                active ? "" : "border-transparent bg-card text-ink-3"
              }`}
              style={sessionChipStyle(color, active)}
            >
              {s.name}
            </Link>
          );
        })}
      </div>

      {weeks.length === 0 && (
        <p className="mt-12 text-center text-sm text-ink-2">
          Nada loggeado en esta sesión todavía.
        </p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
      {weeks.map((week) => (
        <div key={week} className="rounded-lg border border-line bg-card p-4">
          <h2 className="mb-2 text-sm font-bold text-volt">
            Semana {week}
            {plan.deloadWeeks.includes(week) && (
              <span className="ml-2 font-mono text-[10px] font-semibold tracking-widest text-warn">
                DESCARGA
              </span>
            )}
          </h2>
          <div className="space-y-2">
            {selected.exercises.map((ex) => {
              const log = byWeekExercise.get(`${week}:${ex.id}`);
              if (!log || log.sets.length === 0) return null;
              return (
                <div key={ex.id} className="text-sm">
                  <p className="text-ink-2">{ex.name}</p>
                  <p className="font-mono text-xs tabular text-ink-3">
                    {log.sets
                      .map((s) => `${s.reps ?? "-"}·${s.weight ?? "-"}${s.done ? "✓" : ""}`)
                      .join("  ")}
                  </p>
                  {log.comment && (
                    <p className="text-xs italic text-ink-3">“{log.comment}”</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
