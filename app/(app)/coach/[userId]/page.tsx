import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";

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
      <Link href="/coach" className="text-sm text-accent">
        ← Coach
      </Link>
      <div>
        <h1 className="text-xl font-bold">{athlete.name ?? athlete.email}</h1>
        <p className="text-xs text-neutral-400">
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
            className="rounded-2xl border border-neutral-800 bg-card p-4"
          >
            <h2
              className="text-sm font-bold"
              style={{ color: session.color ? `#${session.color}` : undefined }}
            >
              {session.name}
              {lastWeek && (
                <span className="ml-2 text-xs font-normal text-neutral-500">
                  última: S{lastWeek} · {weeks.length} semana(s) loggeada(s)
                </span>
              )}
            </h2>
            {!lastWeek && (
              <p className="mt-1 text-xs text-neutral-500">Sin logs todavía.</p>
            )}
            {lastWeek && (
              <div className="mt-2 space-y-2">
                {session.exercises.map((ex) => {
                  const log = ex.logs.find((l) => l.week === lastWeek);
                  if (!log || log.sets.length === 0) return null;
                  return (
                    <div key={ex.id} className="text-sm">
                      <p className="text-neutral-300">{ex.name}</p>
                      <p className="font-mono text-xs text-neutral-500">
                        {log.sets
                          .map(
                            (s) =>
                              `${s.reps ?? "-"}·${s.weight ?? "-"}${s.done ? "✓" : ""}`
                          )
                          .join("  ")}
                      </p>
                      {log.comment && (
                        <p className="text-xs italic text-neutral-500">
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
