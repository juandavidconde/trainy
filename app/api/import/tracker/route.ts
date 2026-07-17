import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTargetUser } from "@/lib/api-auth";
import { importTracker, TrainyTrackerJson } from "@/lib/trainy-format";

/**
 * POST /api/import/tracker
 * Body: { user_email?: string, planId?: string, data: <tracker_*.json data> }
 * Si no se pasa planId, usa el plan ACTIVE del usuario objetivo.
 * Auth: x-api-key o sesión (self / coach).
 */
export async function POST(req: NextRequest) {
  let body: { user_email?: string; planId?: string } & Partial<TrainyTrackerJson>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const resolved = await resolveTargetUser(req, body.user_email);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let planId = body.planId;
  if (!planId) {
    const active = await prisma.plan.findFirst({
      where: { userId: resolved.user.id, status: "ACTIVE" },
    });
    if (!active) {
      return NextResponse.json(
        { error: "El usuario no tiene plan activo; importá el plan primero" },
        { status: 400 }
      );
    }
    planId = active.id;
  }

  if (!body.data) {
    return NextResponse.json({ error: "Falta el campo 'data'" }, { status: 400 });
  }

  try {
    const result = await importTracker(resolved.user.id, planId, { data: body.data });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error importando tracker" },
      { status: 400 }
    );
  }
}
