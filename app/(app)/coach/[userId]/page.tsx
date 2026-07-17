import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionColor } from "@/lib/brand";

export default async function CoachUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const me = await currentUser();
  if (!me) redirect("/login");
  if (me.role !== "COACH") redirect("/today");
  const { userId } = await params;

  const athlete = await prisma.user.findUnique({ where: { id: userId } });
  if (!athlete) notFound();

  const plan = await prisma.plan.findFirst({
    where: { userId, status: "ACTIVE" },
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
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      <Link href="/coach" className="text-sm text-volt">
        ← Coach
      </Link>
      <div>
        <h1 className="text-xl font-bold">{athlete.name ?? athlete.email}</h1>
        <p className="text-xs text-ink-2">
          {plan ? `${plan.name} · ${plan.split ?? ""}` : "Sin plan activo"}
        </p>
      </div>

      {plan?.sessions.map((session) => {
        const weeks = [
          ...new Set(
            session.exercises.flatMap((e) => e.logs.map((l) => l.week))
          ),
        ].sort((a, b) => b - a);
        const lastWeek = weeks[0];

        return (
          <div
            key={session.id}
            className="rounded-lg border border-line bg-card p-4"
            style={{
              borderLeft: `3px solid ${sessionColor(session.name, session.color)}`,
            }}
          >
            <h2
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: sessionColor(session.name, session.color) }}
            >
              {session.name}
              {lastWeek && (
                <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-ink-3">
                  última: S{lastWeek} · {weeks.length} semana(s) loggeada(s)
                </span>
              )}
            </h2>
            {!lastWeek && (
              <p className="mt-1 text-xs text-ink-3">Sin logs todavía.</p>
            )}
            {lastWeek && (
              <div className="mt-2 space-y-2">
                {session.exercises.map((ex) => {
                  const log = ex.logs.find((l) => l.week === lastWeek);
                  if (!log || log.sets.length === 0) return null;
                  return (
                    <div key={ex.id} className="text-sm">
                      <p className="text-ink-2">{ex.name}</p>
                      <p className="font-mono text-xs tabular text-ink-3">
                        {log.sets
                          .map(
                            (s) =>
                              `${s.reps ?? "-"}·${s.weight ?? "-"}${s.done ? "✓" : ""}`
                          )
                          .join("  ")}
                      </p>
                      {log.comment && (
                        <p className="text-xs italic text-ink-3">
                          “{log.comment}”
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
