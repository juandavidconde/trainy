// Genera el bloque de 12 semanas desde el onboarding y lo importa como plan activo.
import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiCoachEnabled } from "@/lib/coach-ai";
import { parseProfile, serializeProfile, missingRequired, AthleteProfile } from "@/lib/profile";
import { generateAndImport } from "@/lib/plan-generator";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!aiCoachEnabled()) {
    return NextResponse.json(
      { error: "La generación de planes no está configurada en esta instancia (falta ANTHROPIC_API_KEY). Pedile tu bloque a tu coach." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));

  // El wizard manda el perfil completo + disponibilidad; también se puede
  // regenerar desde el perfil ya guardado.
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const profile: AthleteProfile = {
    ...parseProfile(dbUser?.profile),
    ...(body.profile ?? {}),
  };
  const dias = parseInt(body.dias, 10);
  const tiempoSesion = String(body.tiempoSesion ?? "").trim();

  if (!Number.isInteger(dias) || dias < 2 || dias > 6) {
    return NextResponse.json({ error: "Días por semana inválidos (2-6)" }, { status: 400 });
  }
  if (!tiempoSesion) {
    return NextResponse.json({ error: "Falta el tiempo por sesión" }, { status: 400 });
  }
  const missing = missingRequired(profile);
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Faltan datos del perfil: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // Persistir el perfil actualizado antes de generar
  await prisma.user.update({
    where: { id: user.id },
    data: { profile: serializeProfile(profile) },
  });

  // Rate limit: máx 3 generaciones por día por usuario (cada una cuesta API)
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const today = await prisma.plan.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });
  if (today >= 3) {
    return NextResponse.json(
      { error: "Llegaste al límite de 3 planes generados hoy. Mañana podés regenerar." },
      { status: 429 }
    );
  }

  try {
    const summary = await generateAndImport(user.id, {
      profile,
      dias,
      tiempoSesion,
      nombre: user.name ?? dbUser?.name ?? null,
    });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("generate-plan:", e);
    return NextResponse.json(
      { error: "No se pudo generar el plan. Probá de nuevo en un momento." },
      { status: 500 }
    );
  }
}
