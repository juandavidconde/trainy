"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/auth";
import { otpEnabled, requestLoginCode, verifyLoginCode } from "@/lib/otp";
import { POSITION_COOKIE } from "@/lib/position";
import { dateAtNoonUtc, todayAtNoonUtc } from "@/lib/week";

export type Result = { ok: true; info?: string } | { ok: false; error: string };

function normalizeEmail(raw: string): string {
  return (raw ?? "").trim().toLowerCase();
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Correo ────────────────────────────────────────────────────

/** Manda un código al correo NUEVO. Confirma que la persona lo controla. */
export async function requestEmailChangeCode(
  newEmailRaw: string
): Promise<Result & { devCode?: string }> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const email = normalizeEmail(newEmailRaw);
  if (!validEmail(email)) return { ok: false, error: "Correo inválido" };
  if (email === user.email.toLowerCase()) {
    return { ok: false, error: "Ese ya es tu correo actual" };
  }
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return { ok: false, error: "Ese correo ya está en uso" };

  if (!otpEnabled()) {
    return {
      ok: false,
      error:
        "Esta instancia no tiene envío de correo configurado (RESEND_API_KEY). Confirmá el cambio con tu contraseña.",
    };
  }

  const res = await requestLoginCode(email, "email-change");
  if (!res.ok) return { ok: false, error: res.error };
  return {
    ok: true,
    devCode: res.devCode,
    info: `Te mandamos un código de 6 dígitos a ${email}. Vence en 10 minutos.`,
  };
}

/**
 * Cambia el correo de la cuenta.
 * Con envío de correo configurado se exige el código que llegó al correo nuevo;
 * si no lo hay, se cae a la contraseña actual como prueba de identidad.
 */
export async function changeEmail(
  newEmailRaw: string,
  code: string,
  currentPassword: string
): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const email = normalizeEmail(newEmailRaw);
  if (!validEmail(email)) return { ok: false, error: "Correo inválido" };
  if (email === user.email.toLowerCase()) {
    return { ok: false, error: "Ese ya es tu correo actual" };
  }

  if (otpEnabled()) {
    const valid = await verifyLoginCode(email, code, "email-change");
    if (!valid) return { ok: false, error: "Código incorrecto o vencido" };
  } else if (user.passwordHash) {
    const ok = await bcrypt.compare(currentPassword ?? "", user.passwordHash);
    if (!ok) return { ok: false, error: "Contraseña incorrecta" };
  } else {
    return {
      ok: false,
      error:
        "No hay forma de verificar el cambio: la instancia no manda correos y tu cuenta no tiene contraseña. Creá una contraseña primero.",
    };
  }

  // Se re-chequea acá por si alguien reclamó el correo entre el código y esto
  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) return { ok: false, error: "Ese correo ya está en uso" };

  await prisma.user.update({
    where: { id: user.id },
    data: { email, emailVerified: new Date() },
  });
  revalidatePath("/settings");
  return { ok: true, info: `Listo, tu correo ahora es ${email}.` };
}

// ── Contraseña ────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const next = newPassword ?? "";
  if (next.length < 8) {
    return { ok: false, error: "La contraseña necesita al menos 8 caracteres" };
  }

  // Cuentas que entraron por Google o por código no tienen contraseña todavía:
  // la sesión activa ya es prueba suficiente para crear la primera.
  if (user.passwordHash) {
    const ok = await bcrypt.compare(currentPassword ?? "", user.passwordHash);
    if (!ok) return { ok: false, error: "La contraseña actual no coincide" };
    if (currentPassword === next) {
      return { ok: false, error: "La nueva contraseña es igual a la actual" };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  revalidatePath("/settings");
  return {
    ok: true,
    info: user.passwordHash ? "Contraseña actualizada." : "Contraseña creada.",
  };
}

// ── Bloque ────────────────────────────────────────────────────

async function activePlan(userId: string) {
  return prisma.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
}

/** Corrige en qué semana del bloque estás sin tener que re-importar el plan. */
export async function saveStartDate(iso: string): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const date = dateAtNoonUtc(iso);
  if (!date) return { ok: false, error: "Fecha inválida" };
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
    return { ok: false, error: "La fecha de inicio no puede estar en el futuro" };
  }

  const plan = await activePlan(user.id);
  if (!plan) return { ok: false, error: "No tenés un bloque activo" };

  await prisma.plan.update({ where: { id: plan.id }, data: { startDate: date } });
  (await cookies()).delete(POSITION_COOKIE);
  revalidatePath("/settings");
  revalidatePath("/today");
  return { ok: true, info: "Fecha de inicio actualizada." };
}

/** Borra los registros del bloque activo y lo deja en Semana 1 desde hoy.
 *  El plan (sesiones y ejercicios) se conserva. */
export async function resetBlock(): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { sessions: { include: { exercises: { select: { id: true } } } } },
  });
  if (!plan) return { ok: false, error: "No tenés un bloque activo" };

  const exerciseIds = plan.sessions.flatMap((s) => s.exercises.map((e) => e.id));
  const { count } = await prisma.workoutLog.deleteMany({
    where: { userId: user.id, exerciseId: { in: exerciseIds } },
  });

  await prisma.plan.update({
    where: { id: plan.id },
    data: { startDate: todayAtNoonUtc() },
  });

  (await cookies()).delete(POSITION_COOKIE);
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/progress");
  return {
    ok: true,
    info: `Bloque reiniciado en Semana 1. Se borraron ${count} registro(s).`,
  };
}

/** Borra el bloque activo completo (plan + registros) para armar uno nuevo.
 *  Los bloques ya archivados no se tocan. */
export async function startFresh(): Promise<Result> {
  const user = await currentUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const plan = await activePlan(user.id);
  if (!plan) return { ok: false, error: "No tenés un bloque activo" };

  // El cascade del schema se lleva sesiones, ejercicios y sus registros
  await prisma.plan.delete({ where: { id: plan.id } });

  (await cookies()).delete(POSITION_COOKIE);
  revalidatePath("/settings");
  revalidatePath("/today");
  revalidatePath("/history");
  revalidatePath("/progress");
  return { ok: true, info: "Bloque borrado. Armá el nuevo." };
}
