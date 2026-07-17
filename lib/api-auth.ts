import { NextRequest } from "next/server";
import { User } from "@prisma/client";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Resuelve el usuario objetivo de una llamada de API.
 * Dos caminos:
 *  1. Header `x-api-key` == TRAINY_API_KEY (el skill Trainy empujando datos):
 *     requiere `userEmail`; crea el usuario si no existe (cuando esa persona
 *     luego entre con Google/password con el mismo email, queda vinculada).
 *  2. Sesión de navegador: actúa sobre sí mismo, o sobre `userEmail` si es COACH.
 */
export async function resolveTargetUser(
  req: NextRequest,
  userEmail?: string | null
): Promise<{ user: User } | { error: string; status: number }> {
  const apiKey = req.headers.get("x-api-key");
  const configuredKey = process.env.TRAINY_API_KEY;

  if (apiKey) {
    if (!configuredKey || apiKey !== configuredKey) {
      return { error: "API key inválida", status: 401 };
    }
    const email = userEmail?.trim().toLowerCase();
    if (!email) {
      return { error: "user_email es requerido con API key", status: 400 };
    }
    const user = await prisma.user.upsert({
      where: { email },
      create: { email, name: email.split("@")[0] },
      update: {},
    });
    return { user };
  }

  const me = await currentUser();
  if (!me) return { error: "No autenticado", status: 401 };

  const email = userEmail?.trim().toLowerCase();
  if (!email || email === me.email.toLowerCase()) return { user: me };

  if (me.role !== "COACH") {
    return { error: "Solo un coach puede actuar sobre otro usuario", status: 403 };
  }
  const target = await prisma.user.upsert({
    where: { email },
    create: { email, name: email.split("@")[0] },
    update: {},
  });
  return { user: target };
}
