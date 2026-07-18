// Coach IA — armado del contexto ("dossier del atleta") para la Claude API.
// El dossier se reconstruye en cada mensaje: siempre refleja el estado real de la DB.
import { prisma } from "@/lib/prisma";

export function aiCoachEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export function currentWeek(startDate: Date | null, weeks: number): number {
  if (!startDate) return 1;
  const elapsed =
    Math.floor((Date.now() - startDate.getTime()) / (7 * 24 * 3600 * 1000)) + 1;
  return Math.min(Math.max(elapsed, 1), weeks);
}

function num(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/[\d.]+/);
  if (!m) return null;
  const v = parseFloat(m[0]);
  return Number.isFinite(v) ? v : null;
}

/** Semanas de historial reciente que se incluyen set por set. */
const RECENT_WEEKS = 4;

export async function buildDossier(userId: string): Promise<string> {
  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.plan.findFirst({
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
    }),
  ]);

  const out: string[] = [];

  out.push(`## Atleta\nNombre: ${user?.name ?? "(sin nombre)"}`);
  out.push(
    user?.profile?.trim()
      ? `Perfil (escrito por el atleta):\n${user.profile.trim()}`
      : `Perfil: (vacío — si te falta contexto de edad, objetivo o lesiones, pedile al atleta que lo complete en "Mi perfil")`
  );

  if (!plan) {
    out.push(`\n## Plan\nSin plan activo. Sugerile generar su bloque con su coach.`);
    return out.join("\n");
  }

  const week = currentWeek(plan.startDate, plan.weeks);
  out.push(
    `\n## Bloque activo: "${plan.name}"`,
    [
      plan.objective && `Objetivo: ${plan.objective}`,
      plan.split && `Split: ${plan.split}`,
      `Duración: ${plan.weeks} semanas · Semana actual: S${week}`,
      plan.deloadWeeks.length > 0 &&
        `Descargas: ${plan.deloadWeeks.map((w) => `S${w}`).join(", ")}${
          plan.deloadWeeks.includes(week) ? " — ESTA SEMANA ES DESCARGA" : ""
        }`,
      plan.daysPerWeek && `Días/semana: ${plan.daysPerWeek}`,
      plan.sessionTime && `Tiempo por sesión: ${plan.sessionTime}`,
    ]
      .filter(Boolean)
      .join("\n")
  );
  if (plan.calendar) {
    out.push(`Calendario: ${JSON.stringify(plan.calendar)}`);
  }

  // Prescripción + historial por ejercicio.
  // "Reciente" = últimas semanas CON registros (no calendario): tras una pausa
  // (vacaciones, viaje) el coach igual ve los últimos entrenos reales.
  const loggedWeeks = [
    ...new Set(
      plan.sessions.flatMap((s) =>
        s.exercises.flatMap((e) => e.logs.filter((l) => l.sets.length > 0).map((l) => l.week))
      )
    ),
  ].sort((a, b) => b - a);
  const recentWeeks = new Set(loggedWeeks.slice(0, RECENT_WEEKS));
  const weeksLabel =
    recentWeeks.size > 0
      ? [...recentWeeks].sort((a, b) => a - b).map((w) => `S${w}`).join(", ")
      : "ninguna todavía";
  out.push(
    `\n## Prescripción e historial (sets de las últimas semanas registradas: ${weeksLabel}; formato set: reps×peso@RPE, ✓=completada)`
  );

  for (const session of plan.sessions) {
    out.push(`\n### Sesión ${session.name}${session.subtitle ? ` — ${session.subtitle}` : ""}`);
    for (const ex of session.exercises) {
      const spec = [
        ex.progression,
        ex.startWeight && `arranque ${ex.startWeight}`,
        ex.tempo && `tempo ${ex.tempo}`,
        ex.prBaseline && `PR previo al bloque: ${ex.prBaseline}`,
      ]
        .filter(Boolean)
        .join(" · ");
      out.push(`- **${ex.name}**${spec ? ` (${spec})` : ""}`);
      if (ex.notes) out.push(`  Nota del plan: ${ex.notes}`);

      // Mejor e1RM de todo el bloque
      let best: { label: string; score: number } | null = null;
      for (const log of ex.logs) {
        for (const set of log.sets) {
          const w = num(set.weight);
          const r = num(set.reps);
          if (w !== null && r !== null && r > 0) {
            const e = w * (1 + r / 30);
            if (!best || e > best.score) {
              best = { label: `${set.reps}×${set.weight} (S${log.week}, e1RM≈${Math.round(e)})`, score: e };
            }
          }
        }
      }
      if (best) out.push(`  Mejor marca del bloque: ${best.label}`);

      const recent = ex.logs
        .filter((l) => recentWeeks.has(l.week))
        .sort((a, b) => a.week - b.week);
      for (const log of recent) {
        if (log.sets.length === 0) continue;
        const sets = log.sets
          .map(
            (s) =>
              `${s.reps ?? "-"}×${s.weight ?? "-"}${s.rpe ? `@${s.rpe}` : ""}${s.done ? "✓" : ""}`
          )
          .join(", ");
        out.push(`  S${log.week}: ${sets}${log.comment ? ` — comentario: "${log.comment}"` : ""}`);
      }
      if (recent.length === 0) out.push(`  (sin registros recientes)`);
    }
  }

  // Adherencia: ejercicios loggeados por semana vs. planeados
  const totalExercises = plan.sessions.reduce((n, s) => n + s.exercises.length, 0);
  const byWeek = new Map<number, number>();
  for (const session of plan.sessions) {
    for (const ex of session.exercises) {
      for (const log of ex.logs) {
        if (log.sets.some((s) => s.done)) {
          byWeek.set(log.week, (byWeek.get(log.week) ?? 0) + 1);
        }
      }
    }
  }
  const adherence = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([w, n]) => `S${w}: ${n}/${totalExercises} ejercicios`)
    .join(" · ");
  out.push(`\n## Adherencia (ejercicios con al menos una serie completada)\n${adherence || "Sin registros todavía."}`);

  return out.join("\n");
}

export function systemPrompt(dossier: string): string {
  return `Sos el Coach IA de Trainy, una app de tracking de entrenamiento de fuerza e hipertrofia. Sos un coach experto basado en evidencia (periodización, sobrecarga progresiva, RPE, hipertrofia, fuerza, técnica de básicos y accesorios).

Abajo tenés el dossier completo y actualizado del atleta: su perfil, su bloque activo, la prescripción de cada ejercicio y lo que realmente registró (reps, pesos, RPE, comentarios, adherencia). Usalo — tus respuestas deben referirse a SUS datos concretos (pesos, semanas, marcas), no a generalidades.

Reglas:
- Respondé en español, tono cercano y directo (voseo). El atleta suele escribir DESDE el gym: andá al grano, números concretos primero, explicación breve después. Listas cortas mejor que párrafos largos.
- Podés aconsejar microajustes del día (peso, reps objetivo, RPE, orden, sustitución puntual por equipo ocupado o molestia leve). NO rediseñás el plan: cambios estructurales (split, ejercicios fijos, duración) van con su coach o regenerando el bloque.
- Si la semana actual es de descarga, recordalo y protegé la descarga: no empujes PRs.
- Dolor agudo, mareo o posible lesión → recomendá parar y consultar a un profesional de salud. No diagnosticás.
- Si el perfil está vacío y la pregunta lo amerita, pedile una vez que complete "Mi perfil" en esta misma pestaña.
- No inventes datos que no estén en el dossier. Si no registró algo, decilo.

${dossier}`;
}
