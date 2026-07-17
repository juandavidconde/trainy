import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sessionColor, sessionChipStyle } from "@/lib/brand";
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

const PROGRESSION_COLORS: Record<string, string> = {
  COMPOUND: "#FF6961",
  HYPER: "#45D0E8",
  HYPER_ALTO: "#45D0E8",
  LIGHT: "#57D993",
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
      <div className="mt-24 text-center text-ink-2">
        <p className="text-3xl">🏋️</p>
        <p className="mt-3 font-semibold text-ink">
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
  const selectedColor = sessionColor(selected.name, selected.color);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div>
          <h1 className="text-xl font-bold md:text-2xl">{plan.name}</h1>
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
            {[plan.split, plan.objective].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className="font-mono text-[11px] text-ink-3">
          {todayName} · semana actual: S{thisWeek}
        </p>
      </div>

      {isRestDay && (
        <div className="rounded-lg border border-line bg-card px-4 py-3 text-sm text-ink-2">
          Hoy toca <span className="font-semibold text-ink">{todayLabel}</span>{" "}
          según tu calendario. Si igual entrenás, elegí la sesión abajo. 💤
        </div>
      )}

      {/* Selector de semana */}
      <div className="scrollbar-hide -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max items-center gap-1.5 pb-1">
          {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((w) => {
            const isDl = plan.deloadWeeks.includes(w);
            const active = w === week;
            return (
              <Link
                key={w}
                id={active ? "week-active" : undefined}
                href={`/today?week=${w}&session=${encodeURIComponent(selected.name)}`}
                className={`relative flex h-11 min-w-[2.75rem] items-center justify-center rounded-full px-3 font-display text-xs font-bold tabular ${
                  active
                    ? "bg-volt text-volt-ink shadow-glow"
                    : w === thisWeek
                      ? "bg-card text-volt ring-1 ring-volt/50"
                      : isDl
                        ? "deload-stripes border border-line-strong text-ink-3"
                        : "bg-card text-ink-3"
                }`}
              >
                S{w}
                {isDl && (
                  <span
                    className={`ml-1 font-mono text-[8px] font-semibold tracking-widest ${
                      active ? "text-volt-ink/70" : "text-warn"
                    }`}
                  >
                    DL
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <ScrollActiveIntoView targetId="week-active" />

      {isDeload && (
        <div className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 text-xs text-warn">
          Semana de descarga — bajá volumen/intensidad según tu plan.
        </div>
      )}

      {/* Tabs de sesión */}
      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {plan.sessions.map((s) => {
          const active = s.id === selected.id;
          const color = sessionColor(s.name, s.color);
          const abbr = s.dayOfWeek ? DAY_ABBR[s.dayOfWeek] ?? s.dayOfWeek : null;
          return (
            <Link
              key={s.id}
              href={`/today?week=${week}&session=${encodeURIComponent(s.name)}`}
              className={`flex h-11 shrink-0 flex-col items-center justify-center rounded-lg border px-3.5 leading-tight ${
                active
                  ? "font-display"
                  : "border-transparent bg-card text-ink-3"
              }`}
              style={sessionChipStyle(color, active)}
            >
              <span className="text-[13px] font-bold uppercase tracking-widest">
                {s.name}
                {todaySession?.id === s.id && (
                  <span className="ml-1.5 font-mono text-[9px] font-semibold normal-case tracking-normal opacity-80">
                    hoy
                  </span>
                )}
              </span>
              {abbr && (
                <span className="font-mono text-[9px] tracking-widest opacity-60">
                  {abbr}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {selected.subtitle && (
        <p className="text-xs text-ink-3">{selected.subtitle}</p>
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
          const progColor = ex.progression
            ? PROGRESSION_COLORS[ex.progression] ?? "#A08BFF"
            : null;
          return (
            <div
              key={ex.id}
              className="rounded-lg border border-line bg-card p-4"
              style={{ borderLeft: `3px solid ${selectedColor}` }}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-sans font-semibold leading-snug">
                  {ex.name}
                </h3>
                {ex.progression && progColor && (
                  <span
                    className="shrink-0 rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest"
                    style={{
                      color: progColor,
                      backgroundColor: `${progColor}1F`,
                      borderColor: `${progColor}40`,
                    }}
                  >
                    {ex.progression}
                  </span>
                )}
              </div>
              <p className="font-mono text-[11px] text-ink-3">
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
                  <summary className="cursor-pointer text-xs text-volt">
                    Notas
                  </summary>
                  <p className="mt-1 text-xs text-ink-2">{ex.notes}</p>
                </details>
              )}
              {prevSets.length > 0 && (
                <p className="mt-2 rounded bg-bg px-3 py-1.5 font-mono text-[11px] text-ink-2">
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
