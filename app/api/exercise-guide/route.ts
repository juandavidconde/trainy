// Guía de técnica por ejercicio. Se genera con Claude la primera vez que
// alguien la pide y queda cacheada en DB para todos los usuarios.
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiCoachEnabled } from "@/lib/coach-ai";
import { guideNameKey } from "@/lib/exercise-pattern";

const MODEL = process.env.COACH_MODEL ?? "claude-sonnet-5";
const MAX_GENERATIONS_PER_DAY = 30; // por usuario; los hits de caché no cuentan

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim().slice(0, 120);
  if (!name) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const nameKey = guideNameKey(name);
  const cached = await prisma.exerciseGuide.findUnique({ where: { nameKey } });
  if (cached) return NextResponse.json({ howTo: cached.howTo, cached: true });

  if (!aiCoachEnabled()) {
    return NextResponse.json(
      { error: "Guía no disponible en esta instancia" },
      { status: 503 }
    );
  }

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const generated = await prisma.exerciseGuide.count({
    where: { createdAt: { gte: since } },
  });
  if (generated >= MAX_GENERATIONS_PER_DAY) {
    return NextResponse.json(
      { error: "Límite diario de guías nuevas alcanzado — probá mañana" },
      { status: 429 }
    );
  }

  const anthropic = new Anthropic();
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: `Sos coach de gimnasio experto. Explicá cómo ejecutar un ejercicio de pesas, en español colombiano neutro (nada de modismos rioplatenses). Formato EXACTO, sin título ni introducción:

**Posición inicial:** 1-2 frases.
**Ejecución:** 2-3 frases (incluí la respiración).
**Claves:** 3 viñetas cortas con "- ".
**Errores comunes:** 2 viñetas cortas con "- ".

Máximo ~130 palabras. Si el nombre no corresponde a un ejercicio real de gimnasio, respondé solo: "No reconozco este ejercicio."`,
    messages: [{ role: "user", content: name }],
  });

  const text = res.content
    .filter((c) => c.type === "text")
    .map((c) => (c.type === "text" ? c.text : ""))
    .join("")
    .trim();

  if (!text || text.startsWith("No reconozco")) {
    return NextResponse.json(
      { error: "No hay guía para este ejercicio" },
      { status: 404 }
    );
  }

  // upsert por si dos usuarios lo piden a la vez
  const saved = await prisma.exerciseGuide.upsert({
    where: { nameKey },
    create: { nameKey, name, howTo: text },
    update: {},
  });

  return NextResponse.json({ howTo: saved.howTo, cached: false });
}
