// Recordatorios de sesión.
//
// De los cuatro atletas reales con plan activo en agosto de 2026, tres nunca
// registraron una serie y el cuarto llevaba 21 días sin entrar. La app entregaba
// el plan y después se callaba: ningún recordatorio, ninguna reactivación. Esta
// es la única pieza que ataca eso de frente.
//
// Se apoya en Resend, la misma integración que ya usa el login por código: sin
// RESEND_API_KEY no manda nada y lo dice claramente en la respuesta.

import { prisma } from "@/lib/prisma";
import { currentWeek, weeksElapsed } from "@/lib/week";
import { blockPhaseFrom } from "@/lib/athlete-state";

export type ReminderKind = "toca-hoy" | "se-esta-cayendo" | "bloque-terminado";

export interface Reminder {
  userId: string;
  email: string;
  name: string | null;
  kind: ReminderKind;
  subject: string;
  body: string;
}

export function remindersEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

function appUrl(): string {
  return process.env.AUTH_URL?.replace(/\/$/, "") ?? "";
}

/** Día de la semana en la TZ de la instancia, como lo escribe el calendario del plan. */
function todayName(): string {
  const tz = process.env.APP_TZ ?? "America/Bogota";
  const n = new Intl.DateTimeFormat("es-CO", { weekday: "long", timeZone: tz }).format(
    new Date()
  );
  return n.charAt(0).toUpperCase() + n.slice(1);
}

const INACTIVE_DAYS = 5;

/**
 * Arma los recordatorios del día. No manda nada: solo decide qué habría que
 * mandar, para que se pueda inspeccionar en seco antes de activarlo.
 *
 * Una sola pieza de correo por persona y por día, con esta prioridad:
 *   1. Terminó el bloque   → hay que renovarlo
 *   2. Se está cayendo     → 5+ días sin registrar
 *   3. Hoy le toca entrenar
 */
export async function buildReminders(): Promise<Reminder[]> {
  const users = await prisma.user.findMany({
    include: {
      plans: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sessions: { select: { name: true } } },
      },
    },
  });

  const activity = await prisma.workoutLog.groupBy({
    by: ["userId"],
    _max: { date: true, week: true },
  });
  const lastDate = new Map(activity.map((a) => [a.userId, a._max.date]));
  const lastWeek = new Map(activity.map((a) => [a.userId, a._max.week]));

  const day = todayName();
  const url = appUrl();
  const out: Reminder[] = [];

  for (const u of users) {
    const plan = u.plans[0];
    if (!plan) continue;

    const week = currentWeek(plan.startDate, plan.weeks);
    const phase = blockPhaseFrom({
      elapsed: weeksElapsed(plan.startDate),
      weeks: plan.weeks,
      lastLoggedWeek: lastWeek.get(u.id) ?? null,
    });
    const last = lastDate.get(u.id) ?? null;
    const days = last
      ? Math.floor((Date.now() - last.getTime()) / (24 * 3600 * 1000))
      : null;
    const first = (u.name ?? "").split(" ")[0] || "";
    const hi = first ? `Hola ${first},` : "Hola,";

    if (phase === "terminado") {
      out.push({
        userId: u.id, email: u.email, name: u.name, kind: "bloque-terminado",
        subject: "Terminaste tu bloque 🏆",
        body: `${hi}\n\nSe cumplieron las ${plan.weeks} semanas de "${plan.name}". Entrá a ver qué conseguiste y armá el siguiente: ${url}/cierre`,
      });
      continue;
    }

    if (days === null || days >= INACTIVE_DAYS) {
      const lead =
        days === null
          ? `Tu bloque "${plan.name}" está listo desde hace rato y todavía no registraste tu primera serie.`
          : `Llevás ${days} días sin registrar.`;
      out.push({
        userId: u.id, email: u.email, name: u.name, kind: "se-esta-cayendo",
        subject: days === null ? "Tu bloque te está esperando" : "¿Retomamos?",
        // Sin culpa: la persona que abandonó ya se siente mal, y el correo que
        // la regaña no la trae de vuelta.
        body: `${hi}\n\n${lead}\n\nNo hace falta ponerse al día con nada: entrás, hacés la sesión de hoy y marcás las series. Si estuviste afuera un tiempo, la app te ofrece retomar en la semana donde quedaste.\n\n${url}/today`,
      });
      continue;
    }

    // En modo flexible no hay día asignado, así que no hay "hoy te toca X".
    // El disparador natural pasa a ser el tiempo sin entrenar: dos días de
    // silencio. Por debajo de eso la persona está entrenando normal y el
    // correo sobra; por encima de INACTIVE_DAYS ya salió el de "se está
    // cayendo", que tiene prioridad y corta antes de llegar acá.
    if (u.scheduleMode === "FLEXIBLE") {
      if (days === null || days < 2) continue;
      out.push({
        userId: u.id, email: u.email, name: u.name, kind: "toca-hoy",
        subject: "Te espera la siguiente sesión",
        body: `${hi}\n\nLlevás ${days} días sin registrar. Entrá y seguí con la sesión que te falta — semana ${week} de ${plan.weeks}.\n\n${url}/today`,
      });
      continue;
    }

    const calendar = (plan.calendar ?? {}) as Record<string, string>;
    const label = calendar[day];
    const isTraining =
      !!label && plan.sessions.some((s) => s.name.toLowerCase() === label.toLowerCase());
    if (!isTraining) continue;

    out.push({
      userId: u.id, email: u.email, name: u.name, kind: "toca-hoy",
      subject: `Hoy toca ${label}`,
      body: `${hi}\n\nHoy te toca ${label} — semana ${week} de ${plan.weeks}.\n\n${url}/today`,
    });
  }

  return out;
}

/** Manda un recordatorio por Resend. */
export async function sendReminder(r: Reminder): Promise<boolean> {
  const from = process.env.EMAIL_FROM ?? "Trainy <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: r.email,
      subject: r.subject,
      text: r.body,
    }),
  });
  return res.ok;
}
