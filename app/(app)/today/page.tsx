import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import ExerciseLogger from "@/components/ExerciseLogger";
import RestTimer from "@/components/RestTimer";
import ScrollActiveIntoView from "@/components/ScrollActiveIntoView";

const DAY_ABBR: Record<string, string> = {
  Lunes: "LUN",
  Martes: "MAR",
  Miércoles: "MIÉ",
  Jueves: "JUE",
  Viernes: "VIE",
  Sábado: "SÁB",
  Domingo: "DOM",
};

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Día de la semana en la zona horaria de la instancia (el server corre en UTC). */
function todayNameInTz(): string {
  const tz = process.env.APP_TZ ?? "America/Bogota";
  const name = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    timeZone: tz,
  }).format(new Date());
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function currentWeek(startDate: Date | null, weeks: number): number {
  if (!startDate) return 1;
  const elapsed =
    Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
  return clamp(elapsed, 1, weeks);
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; session?: string }>;
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
      <div className="mt-24 text-center text-neutral-400">
        <p className="text-3xl">🏋️</p>
        <p className="mt-3 font-semibold text-neutral-200">
          Todavía no tenés un plan
        </p>
        <p className="mt-1 text-sm">
          Pedile a tu coach que importe tu bloque, o corré el skill Trainy.
        </p>
      </div>
    );
  }

  const thisWeek = currentWeek(plan.startDate, plan.weeks);
  const week = sp.week
    ? clamp(parseInt(sp.week, 10) || 1, 1, plan.weeks)
    : thisWeek;

  const todayName = todayNameInTz();
  const calendar = (plan.calendar ?? {}) as Record<string, string>;
  const todayLabel = calendar[todayName] ?? null;
  const todaySession = plan.sessions.find(
    (s) => todayLabel && s.name.toLowerCase() === todayLabel.toLowerCase()
  );
  const selected =
    plan.sessions.find((s) => s.name === sp.session) ??
    todaySession ??
    plan.sessions[0];

  const exerciseIds = selected.exercises.map((e) => e.id);
  const [logs, prevLogs] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { userId: user.id, week, exerciseId: { in: exerciseIds } },
      include: { sets: { orderBy: { setIndex: "asc" } } },
    }),
    week > 1
      ? prisma.workoutLog.findMany({
          where: { userId: user.id, week: week - 1, exerciseId: { in: exerciseIds } },
          include: { sets: { orderBy: { setIndex: "asc" } } },
        })
      : Promise.resolve([]),
  ]);
  const logByExercise = new Map(logs.map((l) => [l.exerciseId, l]));
  const prevByExercise = new Map(prevLogs.map((l) => [l.exerciseId, l]));

  const isDeload = plan.deloadWeeks.includes(week);
  const isRestDay = !!todayLabel && !todaySession;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">{plan.name}</h1>
          <p className="text-xs text-neutral-400">
            {[plan.split, plan.objective].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="text-xs text-neutral-500">
          {todayName} · semana actual: S{thisWeek}
        </p>
      </div>

      {isRestDay && (
        <div className="rounded-xl border border-neutral-800 bg-card px-4 py-3 text-sm text-neutral-300">
          Hoy toca <span className="font-semibold">{todayLabel}</span> según tu
          calendario. Si igual entrenás, elegí la sesión abajo. 💤
        </div>
      )}

      {/* Selector de semana */}
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1.5 pb-1">
          {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((w) => (
            <Link
              key={w}
              id={w === week ? "week-active" : undefined}
              href={`/today?week=${w}&session=${encodeURIComponent(selected.name)}`}
              className={`relative rounded-full px-3.5 py-2 text-xs font-semibold ${
                w === week
                  ? "bg-accent text-white"
                  : w === thisWeek
                    ? "bg-card text-accent ring-1 ring-accent/50"
                    : "bg-card text-neutral-400"
              }`}
            >
              S{w}
              {plan.deloadWeeks.includes(w) && (
                <span className="ml-1 text-[10px] opacity-70">DL</span>
              )}
            </Link>
          ))}
        </div>
      </div>
      <ScrollActiveIntoView targetId="week-active" />

      {isDeload && (
        <div className="rounded-xl border border-yellow-600/40 bg-yellow-600/10 px-4 py-2 text-xs text-yellow-300">
          Semana de descarga — bajá volumen/intensidad según tu plan.
        </div>
      )}

      {/* Tabs de sesión */}
      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {plan.sessions.map((s) => {
          const active = s.id === selected.id;
          const color = s.color ? `#${s.color}` : "#4f8cff";
          const abbr = s.dayOfWeek ? DAY_ABBR[s.dayOfWeek] ?? s.dayOfWeek : null;
          return (
            <Link
              key={s.id}
              href={`/today?week=${week}&session=${encodeURIComponent(s.name)}`}
              className={`flex shrink-0 flex-col items-center rounded-xl px-3.5 py-2 leading-tight ${
                active ? "text-white" : "bg-card text-neutral-400"
              }`}
              style={active ? { backgroundColor: color } : undefined}
            >
              <span className="text-sm font-bold">
                {s.name}
                {todaySession?.id === s.id && " · hoy"}
              </span>
              {abbr && (
                <span className={`text-[10px] ${active ? "opacity-80" : "opacity-60"}`}>
                  {abbr}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {selected.subtitle && (
        <p className="text-xs text-neutral-500">{selected.subtitle}</p>
      )}

      {/* Ejercicios */}
      <div className="grid gap-3 md:grid-cols-2">
        {selected.exercises.map((ex) => {
          const log = logByExercise.get(ex.id);
          const prev = prevByExercise.get(ex.id);
          const prevSets =
            prev?.sets.map((s) => ({
              reps: s.reps ?? "",
              weight: s.weight ?? "",
              rpe: s.rpe ?? "",
              done: s.done,
            })) ?? [];
          return (
            <div
              key={ex.id}
              className="rounded-2xl border border-neutral-800 bg-card p-4"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-snug">{ex.name}</h3>
                {ex.progression && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ex.progression === "COMPOUND"
                        ? "bg-red-500/20 text-red-300"
                        : ex.progression === "HYPER" ||
                            ex.progression === "HYPER_ALTO"
                          ? "bg-blue-500/20 text-blue-300"
                          : ex.progression === "LIGHT"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-purple-500/20 text-purple-300"
                    }`}
                  >
                    {ex.progression}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                {[
                  ex.startWeight && `S1: ${ex.startWeight}`,
                  ex.tempo && `Tempo ${ex.tempo}`,
                  ex.prBaseline && `PR: ${ex.prBaseline}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {ex.notes && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-accent">
                    Notas
                  </summary>
                  <p className="mt-1 text-xs text-neutral-400">{ex.notes}</p>
                </details>
              )}
              {prevSets.length > 0 && (
                <p className="mt-2 rounded-lg bg-surface px-3 py-1.5 text-xs text-neutral-400">
                  S{week - 1}:{" "}
                  {prevSets.map((s) => `${s.reps || "-"}·${s.weight || "-"}`).join(" / ")}
                </p>
              )}
              <ExerciseLogger
                key={`${ex.id}-${week}`}
                exerciseId={ex.id}
                week={week}
                progression={ex.progression}
                initialSets={
                  log?.sets.map((s) => ({
                    reps: s.reps ?? "",
                    weight: s.weight ?? "",
                    rpe: s.rpe ?? "",
                    done: s.done,
                  })) ?? []
                }
                initialComment={log?.comment ?? ""}
                prevSets={prevSets}
              />
            </div>
          );
        })}
      </div>

      <RestTimer />
    </div>
  );
}
