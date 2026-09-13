import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkEmail, normalizeEmail } from "@/lib/email";

/**
 * POST /api/register — alta con email+password.
 * El primer usuario de la instancia queda como COACH.
 */
export async function POST(req: NextRequest) {
  let body: { email?: string; password?: string; name?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const email = normalizeEmail(body.email);
  const password = body.password ?? "";
  // El correo es la llave de la cuenta: con lo que entrás y con lo que el coach
  // te publica los bloques. Un typo acá deja una cuenta muerta e incontactable.
  const emailCheck = checkEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json(
      { error: emailCheck.error, suggestion: emailCheck.suggestion },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña necesita al menos 8 caracteres" },
      { status: 400 }
    );
  }

  // Viene del `?ref=` del link de invitación. Se acota porque es texto que
  // entra por la URL y termina en la base sin pasar por ninguna otra validación.
  const ref = body.ref?.trim().slice(0, 60) || null;

  const passwordHash = await bcrypt.hash(password, 10);
  // Mientras no exista un coach, quien se registre se vuelve coach
  // (el import por API puede pre-crear atletas, no cuentan como "primero").
  const coachExists = (await prisma.user.count({ where: { role: "COACH" } })) > 0;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Usuario pre-creado por el coach/skill sin password todavía → puede reclamarlo.
    if (existing.passwordHash) {
      return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        name: body.name?.trim() || existing.name,
        role: coachExists ? existing.role : "COACH",
        // Solo si no tenía: el primer canal por el que llegó es el que cuenta.
        ...(ref && !existing.ref ? { ref } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: body.name?.trim() || email.split("@")[0],
      role: coachExists ? "ATHLETE" : "COACH",
      ref,
    },
  });
  return NextResponse.json({ ok: true });
}
