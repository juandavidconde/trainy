// Coach IA — chat con streaming. POST envía un mensaje y devuelve texto plano
// en stream; GET trae el historial; DELETE lo borra (nueva conversación).
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiCoachEnabled, buildDossier, systemPrompt } from "@/lib/coach-ai";

export const maxDuration = 60;

const MODEL = process.env.COACH_MODEL ?? "claude-sonnet-5";
const MAX_MESSAGES_PER_DAY = 60;
const HISTORY_TURNS = 30;

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  // Solo en dev: inspección del dossier que recibe el modelo
  if (
    process.env.NODE_ENV === "development" &&
    new URL(req.url).searchParams.get("debug") === "dossier"
  ) {
    return new Response(await buildDossier(user.id), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return NextResponse.json({ messages });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  await prisma.chatMessage.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!aiCoachEnabled()) {
    return NextResponse.json({ error: "Coach IA no configurado" }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const message = String(body?.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
  if (message.length > 4000) {
    return NextResponse.json({ error: "Mensaje demasiado largo" }, { status: 400 });
  }

  // Rate limit diario por usuario (cuenta solo mensajes del usuario)
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const usedToday = await prisma.chatMessage.count({
    where: { userId: user.id, role: "user", createdAt: { gte: since } },
  });
  if (usedToday >= MAX_MESSAGES_PER_DAY) {
    return NextResponse.json(
      { error: "Llegaste al límite diario del Coach IA. Mañana seguimos." },
      { status: 429 }
    );
  }

  const [dossier, history] = await Promise.all([
    buildDossier(user.id),
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_TURNS,
      select: { role: true, content: true },
    }),
  ]);

  await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: message },
  });

  const turns = history
    .reverse()
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt(dossier),
    messages: [...turns, { role: "user", content: message }],
  });

  const encoder = new TextEncoder();
  let full = "";

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        // Se muestra en vivo pero no se persiste como respuesta del coach
        controller.enqueue(
          encoder.encode("\n\n(Se cortó la conexión con el coach — probá de nuevo.)")
        );
      } finally {
        if (full.trim()) {
          await prisma.chatMessage
            .create({
              data: { userId: user.id, role: "assistant", content: full },
            })
            .catch(() => {});
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
