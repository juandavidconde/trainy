// Coach IA — armado del contexto ("dossier del atleta") para la Claude API.
// El dossier se reconstruye en cada mensaje: siempre refleja el estado real de la DB.
import { prisma } from "@/lib/prisma";
import { missingRequired, parseProfile, profileToText } from "@/lib/profile";
import { collectSignals, SIGNAL_LABEL } from "@/lib/signals";
// Una sola definición de la semana en curso y una sola de cómo se lee un peso.
// Este archivo tenía copias propias de las dos: el e1RM del dossier salía de
// tomar el primer número del string, así que "20 kg c/u" valía 20 y "BW+15"
// valía 15 — y el Coach IA razonaba sobre esos números como si fueran la carga.
import { currentWeek } from "@/lib/week";
import {
  bodyweightKgFromProfile,
  comparableLoad,
  dominantUnit,
  estimate1RM,
  formatLoad,
  parseReps,
  parseWeight,
} from "@/lib/weight";

export function aiCoachEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export { currentWeek };

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
  const profile = parseProfile(user?.profile);
  const profileText = profileToText(profile);
  out.push(
    profileText
      ? `Perfil:\n${profileText}`
      : `Perfil: VACÍO — antes de dar recomendaciones personalizadas, pedile al atleta que llene el formulario "Mi perfil" (botón arriba del chat).`
  );

  if (!plan) {
    out.push(`\n## Plan\nSin plan activo. Sugerile generar su bloque con su coach.`);
    return out.join("\n");
  }

  const week = currentWeek(plan.startDate, plan.weeks);

  // Unidad del bloque y peso corporal del atleta: sin esto, comparar "20 kg c/u"
  // con "115 lb" y con "BW+15" no tiene sentido.
  const bodyweightKg = bodyweightKgFromProfile(profile.peso);
  const unit = dominantUnit(
    plan.sessions.flatMap((s) =>
      s.exercises.flatMap((e) => e.logs.flatMap((l) => l.sets.map((set) => set.weight)))
    ),
    plan.sessions.flatMap((s) => s.exercises.map((e) => e.startWeight))
  );

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
  // Los avisos de dolor iban enterrados dentro del historial, mezclados con
  // comentarios de logística. Acá se levantan al frente para que el coach los
  // trate como lo que son: la única señal del dossier que puede terminar en
  // una lesión.
  const signals = collectSignals(
    plan.sessions.flatMap((s) =>
      s.exercises.flatMap((e) =>
        e.logs.map((l) => ({
          week: l.week,
          comment: l.comment,
          date: l.date,
          exercise: { name: e.name },
        }))
      )
    ),
    { currentWeek: week, withinWeeks: 4 }
  );
  if (signals.length > 0) {
    out.push(
      `\n## ⚠️ Avisos del atleta (últimas 4 semanas)`,
      ...signals
        .slice(0, 8)
        .map(
          (s) =>
            `- [${SIGNAL_LABEL[s.kind]}] S${s.week}${s.exerciseName ? ` · ${s.exerciseName}` : ""}: "${s.text}"`
        ),
      `Si el aviso es de dolor o de una serie que tuvo que cortar, abordalo ANTES que cualquier otra cosa que te pregunte.`
    );
  }

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

      // Mejor e1RM de todo el bloque, con la carga bien interpretada:
      // "c/u" cuenta doble, "BW+15" suma el peso corporal, y los pesos se
      // llevan todos a la misma unidad antes de compararlos.
      let best: { label: string; score: number } | null = null;
      for (const log of ex.logs) {
        for (const set of log.sets) {
          const load = comparableLoad(parseWeight(set.weight), unit, bodyweightKg);
          const reps = parseReps(set.reps);
          if (load === null || reps === null) continue;
          const e = estimate1RM(load, reps);
          if (e === null) continue;
          if (!best || e > best.score) {
            best = {
              label: `${set.reps}×${set.weight} (S${log.week}, e1RM≈${formatLoad(e, unit)})`,
              score: e,
            };
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
- Respondé en español COLOMBIANO, tono cercano y directo. Podés usar voseo suave como se habla en Cali ("mirá", "contame"), pero NUNCA modismos rioplatenses/argentinos: nada de "che", "dale", "laburo", "quilombo", "viste". Si dudás, español neutro.
- El atleta suele escribir DESDE el gym: andá al grano, números concretos primero, explicación breve después. Listas cortas mejor que párrafos largos.
- Respuestas COMPLETAS pero compactas: máximo ~250 palabras. Cerrá siempre la idea — jamás dejes una frase a medias. Si el tema da para más, terminá con una línea ofreciendo profundizar.
- Si el perfil está vacío o le faltan campos importantes para la pregunta (edad, peso, lesiones), tu PRIMERA acción es pedirle que llene el formulario "Mi perfil" (botón arriba del chat). No des recomendaciones personalizadas sin perfil.
- Podés aconsejar microajustes del día (peso, reps objetivo, RPE, orden, sustitución puntual por equipo ocupado o molestia leve). NO rediseñás el plan: cambios estructurales (split, ejercicios fijos, duración) van con su coach o regenerando el bloque.
- Si la semana actual es de descarga, recordalo y protegé la descarga: no empujes PRs.
- Dolor agudo, mareo o posible lesión → recomendá parar y consultar a un profesional de salud. No diagnosticás.
- No inventes datos que no estén en el dossier. Si no registró algo, decilo.

${dossier}`;
}
