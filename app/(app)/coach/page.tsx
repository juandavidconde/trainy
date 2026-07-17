import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import ImportPanel from "@/components/ImportPanel";

export default async function CoachPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "COACH") redirect("/today");

  const [users, activity] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: { plans: { where: { status: "ACTIVE" }, take: 1 } },
    }),
    prisma.workoutLog.groupBy({
      by: ["userId"],
      _max: { updatedAt: true },
    }),
  ]);
  const lastByUser = new Map(
    activity.map((a) => [a.userId, a._max.updatedAt])
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Coach</h1>

      <div className="space-y-2">
        {users.map((u) => {
          const plan = u.plans[0];
          const last = lastByUser.get(u.id);
          return (
            <Link
              key={u.id}
              href={`/coach/${u.id}`}
              className="block rounded-lg border border-line bg-card p-4 active:border-volt"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {u.name ?? u.email}
                  {u.id === user.id && (
                    <span className="ml-2 text-xs text-ink-3">(vos)</span>
                  )}
                </p>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink-3">
                  {u.role === "COACH" ? "coach" : ""}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                {plan ? plan.name : "Sin plan activo"}
                {last &&
                  ` · último log: ${last.toLocaleDateString("es-CO", {
                    day: "numeric",
                    month: "short",
                  })}`}
              </p>
            </Link>
          );
        })}
      </div>

      <ImportPanel />
    </div>
  );
}
