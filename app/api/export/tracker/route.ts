import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveTargetUser } from "@/lib/api-auth";
import { exportTracker } from "@/lib/trainy-format";

/**
 * GET /api/export/tracker?user_email=&planId=
 * Devuelve los logs en el formato tracker_*.json que el skill Trainy analiza.
 * Si no se pasa planId, usa el plan ACTIVE.
 * Auth: x-api-key o sesión (self / coach).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resolved = await resolveTargetUser(req, searchParams.get("user_email"));
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let planId = searchParams.get("planId");
  if (!planId) {
    const active = await prisma.plan.findFirst({
      where: { userId: resolved.user.id, status: "ACTIVE" },
    });
    if (!active) {
      return NextResponse.json({ error: "Sin plan activo" }, { status: 404 });
    }
    planId = active.id;
  }

  const tracker = await exportTracker(resolved.user.id, planId);
  return NextResponse.json(tracker);
}
