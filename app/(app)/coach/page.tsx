import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { loadRoster } from "@/lib/roster";
import ImportPanel from "@/components/ImportPanel";
import AddAthlete from "@/components/coach/AddAthlete";
import StatusChip from "@/components/coach/StatusChip";

function lastLogLabel(days: number | null): string {
  if (days === null) return "sin registros todavía";
  if (days === 0) return "registró hoy";
  if (days === 1) return "registró ayer";
  return `hace ${days} días`;
}

export default async function CoachPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "COACH") redirect("/today");

  const roster = await loadRoster(user.id);
  const needAttention = roster.filter(
    (r) => r.status === "inactivo" || r.status === "atrasado"
  ).length;
  const training = roster.filter((r) => r.plan).length;

  return (
    <div className="space-y-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-bold">Atletas</h1>
        <p className="font-mono text-[11px] text-ink-3">
          {training} entrenando
          {needAttention > 0 && (
            <span className="text-warn"> · {needAttention} a revisar</span>
          )}
        </p>
      </div>

      <AddAthlete />

      <div className="space-y-2">
        {roster.map((r) => (
          <Link
            key={r.id}
            href={`/coach/${r.id}`}
            className="block rounded-lg border border-line bg-card p-4 active:border-volt"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {r.name ?? r.email}
                  {r.isSelf && (
                    <span className="ml-2 text-xs font-normal text-ink-3">
                      (vos)
                    </span>
                  )}
                  {r.role === "COACH" && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-volt">
                      coach
                    </span>
                  )}
                </p>
                <p className="truncate font-mono text-[11px] text-ink-3">
                  {r.email}
                </p>
              </div>
              <StatusChip status={r.status} />
            </div>

            <p className="mt-2 text-xs text-ink-2">
              {r.plan ? (
                <>
                  {r.plan.name} · S{r.week}/{r.plan.weeks}
                  {r.sessionsPerWeek > 0 && (
                    <>
                      {" · "}
                      <span
                        className={
                          r.sessionsThisWeek >= r.sessionsPerWeek
                            ? "text-ok"
                            : "text-ink-2"
                        }
                      >
                        {r.sessionsThisWeek}/{r.sessionsPerWeek} sesiones esta
                        semana
                      </span>
                    </>
                  )}
                </>
              ) : (
                "Sin plan activo"
              )}
            </p>
            <p className="font-mono text-[11px] text-ink-3">
              {lastLogLabel(r.daysSinceLastLog)}
            </p>
          </Link>
        ))}
      </div>

      <ImportPanel />
    </div>
  );
}
