// Disparador diario de recordatorios. Pensado para un cron de Railway:
//
//   curl -X POST https://<app>/api/reminders -H "x-api-key: $TRAINY_API_KEY"
//
// GET hace un simulacro: devuelve a quién le escribiría y con qué texto, sin
// mandar nada. Sirve para revisarlo antes de encenderlo de verdad.
import { NextRequest, NextResponse } from "next/server";
import { buildReminders, remindersEnabled, sendReminder } from "@/lib/reminders";

export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const key = process.env.TRAINY_API_KEY;
  return !!key && req.headers.get("x-api-key") === key;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }
  const reminders = await buildReminders();
  return NextResponse.json({
    dryRun: true,
    enabled: remindersEnabled(),
    count: reminders.length,
    byKind: reminders.reduce<Record<string, number>>((acc, r) => {
      acc[r.kind] = (acc[r.kind] ?? 0) + 1;
      return acc;
    }, {}),
    reminders: reminders.map((r) => ({
      email: r.email, kind: r.kind, subject: r.subject, body: r.body,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "API key inválida" }, { status: 401 });
  }
  if (!remindersEnabled()) {
    return NextResponse.json(
      {
        error:
          "Los recordatorios necesitan RESEND_API_KEY. Sin esa variable no se manda nada; usá GET para ver el simulacro.",
      },
      { status: 503 }
    );
  }

  const reminders = await buildReminders();
  let sent = 0;
  const failed: string[] = [];
  for (const r of reminders) {
    try {
      if (await sendReminder(r)) sent++;
      else failed.push(r.email);
    } catch {
      failed.push(r.email);
    }
  }
  return NextResponse.json({ ok: true, total: reminders.length, sent, failed });
}
