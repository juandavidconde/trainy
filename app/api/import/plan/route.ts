import { NextRequest, NextResponse } from "next/server";
import { resolveTargetUser } from "@/lib/api-auth";
import { importPlan, TrainyPlanJson } from "@/lib/trainy-format";

/**
 * POST /api/import/plan
 * Body: { user_email?: string, plan: <plan.json del skill Trainy> }
 * Auth: header x-api-key (skill) o sesión (self / coach).
 */
export async function POST(req: NextRequest) {
  let body: { user_email?: string; plan?: TrainyPlanJson };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const resolved = await resolveTargetUser(req, body.user_email);
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  if (!body.plan) {
    return NextResponse.json({ error: "Falta el campo 'plan'" }, { status: 400 });
  }

  try {
    const plan = await importPlan(resolved.user.id, body.plan);
    return NextResponse.json({
      ok: true,
      planId: plan.id,
      name: plan.name,
      user: resolved.user.email,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error importando plan" },
      { status: 400 }
    );
  }
}
