"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/auth";
import { dateAtNoonUtc } from "@/lib/week";
import type { Result } from "@/lib/account-actions";

type CoachAuth =
  | { ok: true; me: NonNullable<Awaited<ReturnType<typeof currentUser>>> }
  | { ok: false; error: string };

async function requireCoach(): Promise<CoachAuth> {
  const me = await currentUser();
  if (!me) return { ok: false, error: "No autenticado" };
  if (me.role !== "COACH") {
    return { ok: false, error: "Solo un coach puede hacer esto" };
  }
  return { ok: true, me };
}

function refresh() {
  revalidatePath("/coach");
}

/** Da de alta a alguien por correo. Queda listo para que el skill le publique
 *  el bloque y para que la persona entre con ese mismo correo. */
export async function addAthlete(
  emailRaw: string,
  nameRaw: string
): Promise<Result> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  const email = (emailRaw ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Correo inválido" };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Ese correo ya está en la lista" };

  const name = (nameRaw ?? "").trim().slice(0, 80) || email.split("@")[0];
  await prisma.user.create({ data: { email, name, role: "ATHLETE" } });
  refresh();
  return {
    ok: true,
    info: `${name} quedó agregado. Ya puede entrar con ${email} (con contraseña nueva o con código al correo).`,
  };
}

/** Promueve a coach o baja a atleta. Nunca deja la instancia sin ningún coach. */
export async function setRole(userId: string, role: Role): Promise<Result> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "No existe esa persona" };
  if (target.role === role) return { ok: true, info: "Ya tenía ese rol." };

  if (role === "ATHLETE") {
    const coaches = await prisma.user.count({ where: { role: "COACH" } });
    if (coaches <= 1) {
      return {
        ok: false,
        error:
          "Es el único coach de la instancia. Promové a alguien más antes de bajarlo, o te quedás sin quien administre.",
      };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  refresh();
  revalidatePath(`/coach/${userId}`);
  return {
    ok: true,
    info: role === "COACH" ? "Ahora es coach." : "Ahora es atleta.",
  };
}

/**
 * Baja definitiva: usuario, planes, registros y chat (cascade del schema).
 * Antes esto solo existía como script de consola (`scripts/delete-user.mjs`).
 */
export async function deleteAthlete(
  userId: string,
  confirmEmail: string
): Promise<Result> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  if (userId === auth.me.id) {
    return { ok: false, error: "No podés borrarte a vos mismo desde acá" };
  }
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: { _count: { select: { plans: true, logs: true } } },
  });
  if (!target) return { ok: false, error: "No existe esa persona" };
  if (target.role === "COACH") {
    return {
      ok: false,
      error: "Es coach. Bajalo a atleta primero — así el borrado nunca es un accidente.",
    };
  }
  if ((confirmEmail ?? "").trim().toLowerCase() !== target.email.toLowerCase()) {
    return { ok: false, error: "El correo escrito no coincide" };
  }

  await prisma.user.delete({ where: { id: userId } });
  refresh();
  return {
    ok: true,
    info: `${target.email} borrado, con sus ${target._count.plans} plan(es) y ${target._count.logs} registro(s).`,
  };
}

// Alfabeto sin caracteres que se confunden al dictar por teléfono o WhatsApp:
// nada de 0/O, 1/l/I. La clave se lee en voz alta sin que nadie pregunte "¿ele
// o uno?".
const SAFE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789";

function temporaryPassword(): string {
  const pick = () =>
    Array.from(
      { length: 4 },
      () => SAFE_CHARS[crypto.randomInt(0, SAFE_CHARS.length)]
    ).join("");
  return `${pick()}-${pick()}-${pick()}`;
}

/**
 * Genera una clave temporal para un atleta que perdió la suya.
 *
 * Existe porque esta instancia no manda correos (sin RESEND_API_KEY no hay
 * código ni reset por mail), así que sin esto la única salida era entrar a la
 * base a mano. La clave se devuelve UNA vez: no queda guardada en claro en
 * ningún lado, solo su hash.
 */
export async function resetAthletePassword(
  userId: string
): Promise<Result & { password?: string }> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "No existe esa persona" };
  if (target.id === auth.me.id) {
    return {
      ok: false,
      error: "Tu propia clave la cambiás desde Ajustes, no desde acá",
    };
  }
  if (target.role === "COACH") {
    return {
      ok: false,
      error:
        "Es coach: no le podés cambiar la clave. Bajalo a atleta primero si de verdad hace falta.",
    };
  }

  const password = temporaryPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath(`/coach/${userId}`);
  return {
    ok: true,
    password,
    info: `Clave temporal para ${target.email}. Pasásela y pedile que la cambie en Ajustes.`,
  };
}

/** Corrige en qué semana va el atleta sin re-importar el bloque. */
export async function setAthleteStartDate(
  userId: string,
  iso: string
): Promise<Result> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  const date = dateAtNoonUtc(iso);
  if (!date) return { ok: false, error: "Fecha inválida" };
  if (date.getTime() > Date.now() + 24 * 3600 * 1000) {
    return { ok: false, error: "La fecha de inicio no puede estar en el futuro" };
  }

  const plan = await prisma.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return { ok: false, error: "Ese atleta no tiene bloque activo" };

  await prisma.plan.update({ where: { id: plan.id }, data: { startDate: date } });
  refresh();
  revalidatePath(`/coach/${userId}`);
  revalidatePath("/today");
  return { ok: true, info: "Fecha de inicio actualizada." };
}

/** Cierra el bloque sin borrar nada: queda en el historial y el atleta ve
 *  la pantalla de "todavía no tenés un plan". */
export async function archiveAthletePlan(userId: string): Promise<Result> {
  const auth = await requireCoach();
  if (!auth.ok) return auth;

  const plan = await prisma.plan.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (!plan) return { ok: false, error: "Ese atleta no tiene bloque activo" };

  await prisma.plan.update({
    where: { id: plan.id },
    data: { status: "ARCHIVED" },
  });
  refresh();
  revalidatePath(`/coach/${userId}`);
  return { ok: true, info: `"${plan.name}" quedó archivado.` };
}
