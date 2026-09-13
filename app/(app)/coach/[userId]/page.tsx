import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionColor } from "@/lib/brand";
import { currentWeek, daysSince } from "@/lib/week";
import { parseProfile, PROFILE_FIELDS } from "@/lib/profile";
import { CONSENT_VERSION } from "@/lib/consent";
import AthleteAdmin from "@/components/coach/AthleteAdmin";

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
    orderBy: { createdAt: "desc" },
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

  const week = plan ? currentWeek(plan.startDate, plan.weeks) : null;
  const lastLog = await prisma.workoutLog.aggregate({
    where: { userId },
    _max: { updatedAt: true },
  });
  const days = daysSince(lastLog._max.updatedAt);
  const profile = parseProfile(athlete.profile);
  const profileEntries = PROFILE_FIELDS.map((f) => ({
    label: f.label,
    value: (profile[f.key] ?? "").toString().trim(),
  })).filter((e) => e.value);

  return (
    <div className="space-y-4 md:mx-auto md:max-w-2xl">
      <Link href="/coach" className="text-sm text-volt">
        ← Atletas
      </Link>
      <div>
        <h1 className="text-xl font-bold">{athlete.name ?? athlete.email}</h1>
        <p className="font-mono text-[11px] text-ink-3">{athlete.email}</p>
        <p className="mt-1 text-xs text-ink-2">
          {plan
            ? `${plan.name} · S${week}/${plan.weeks}${plan.split ? ` · ${plan.split}` : ""}`
            : "Sin plan activo"}
          {days !== null &&
            ` · último registro ${days === 0 ? "hoy" : days === 1 ? "ayer" : `hace ${days} días`}`}
        </p>
        {/* Trazabilidad del consentimiento: si alguien reclama, la prueba de la
            autorización es esta fecha con su versión. */}
        <p className="mt-1 font-mono text-[11px]">
          {athlete.consentAcceptedAt ? (
            <span
              className={
                athlete.consentVersion === CONSENT_VERSION ? "text-ok" : "text-warn"
              }
            >
              ✓ Autorización de datos ·{" "}
              {new Intl.DateTimeFormat("es-CO", {
                dateStyle: "medium",
                timeZone: "America/Bogota",
              }).format(athlete.consentAcceptedAt)}
              {athlete.consentVersion !== CONSENT_VERSION &&
                ` · versión ${athlete.consentVersion ?? "?"} (vigente: ${CONSENT_VERSION})`}
            </span>
          ) : (
            <span className="text-ink-3">
              Sin autorización de datos registrada — cuenta anterior al registro
            </span>
          )}
        </p>
      </div>

      <AthleteAdmin
        userId={athlete.id}
        email={athlete.email}
        role={athlete.role}
        isSelf={athlete.id === me.id}
        hasPlan={!!plan}
        planName={plan?.name ?? null}
        startDateIso={plan?.startDate?.toISOString().slice(0, 10) ?? null}
        weeks={plan?.weeks ?? 12}
      />

      {profileEntries.length > 0 && (
        <details className="rounded-lg border border-line bg-surface p-4">
          <summary className="cursor-pointer font-display text-sm font-bold uppercase tracking-widest">
            Perfil del atleta
          </summary>
          <dl className="mt-3 space-y-2">
            {profileEntries.map((e) => (
              <div key={e.label}>
                <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {e.label}
                </dt>
                <dd className="text-sm text-ink-2">{e.value}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      {plan && (
        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-ink-3">
            Último registro por sesión
          </h2>
          {plan.sessions.map((session) => {
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
                <h3
                  className="text-sm font-bold uppercase tracking-widest"
                  style={{ color: sessionColor(session.name, session.color) }}
                >
                  {session.name}
                  {lastWeek && (
                    <span className="ml-2 font-sans text-xs font-normal normal-case tracking-normal text-ink-3">
                      última: S{lastWeek} · {weeks.length} semana(s) loggeada(s)
                    </span>
                  )}
                </h3>
                {!lastWeek && (
                  <p className="mt-1 text-xs text-ink-3">Sin registros todavía.</p>
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
      )}
    </div>
  );
}
