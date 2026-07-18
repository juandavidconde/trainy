// Login con código por email (OTP): recuperación de cuenta y acceso sin
// contraseña. Envío vía Resend; sin RESEND_API_KEY la función queda oculta.
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 min
const RESEND_THROTTLE_MS = 60 * 1000; // 1 código por minuto por email

export function otpEnabled(): boolean {
  // En dev funciona sin Resend: el código se devuelve en la respuesta (solo dev)
  return !!process.env.RESEND_API_KEY || process.env.NODE_ENV === "development";
}

function hashCode(email: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}:${code}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex");
}

// Contador de intentos fallidos en memoria (una instancia). Se resetea al
// pedir código nuevo o reiniciar el contenedor — suficiente para frenar fuerza bruta.
const failedAttempts = new Map<string, number>();
const MAX_ATTEMPTS = 5;

async function sendEmail(to: string, code: string): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Trainy <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `${code} es tu código de Trainy`,
      html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 4px">Train<span style="color:#84cc16">y</span></h2>
        <p style="color:#555">Usá este código para entrar. Vence en 10 minutos.</p>
        <p style="font-size:34px;font-weight:800;letter-spacing:8px;background:#f4f4f5;border-radius:10px;padding:16px;text-align:center">${code}</p>
        <p style="color:#999;font-size:12px">Si no pediste este código, ignorá este correo.</p>
      </div>`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
}

export async function requestLoginCode(
  emailRaw: string
): Promise<{ ok: true; devCode?: string } | { ok: false; error: string }> {
  const email = emailRaw.trim().toLowerCase();
  const identifier = `otp:${email}`;

  // Throttle: si el código vigente se creó hace <1 min, no reenviar
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
  });
  if (existing && existing.expires.getTime() - Date.now() > CODE_TTL_MS - RESEND_THROTTLE_MS) {
    return { ok: false, error: "Ya te enviamos un código hace menos de un minuto. Revisá tu correo." };
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: {
      identifier,
      token: hashCode(email, code),
      expires: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  failedAttempts.delete(email);

  if (process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY) {
    console.log(`[otp] código para ${email}: ${code}`);
    return { ok: true, devCode: code };
  }
  await sendEmail(email, code);
  return { ok: true };
}

export async function verifyLoginCode(emailRaw: string, codeRaw: string): Promise<boolean> {
  const email = emailRaw.trim().toLowerCase();
  const code = codeRaw.trim();
  if (!/^\d{6}$/.test(code)) return false;

  const attempts = failedAttempts.get(email) ?? 0;
  if (attempts >= MAX_ATTEMPTS) return false;

  const identifier = `otp:${email}`;
  const token = await prisma.verificationToken.findFirst({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (!token || token.token !== hashCode(email, code)) {
    failedAttempts.set(email, attempts + 1);
    return false;
  }
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  failedAttempts.delete(email);
  return true;
}
