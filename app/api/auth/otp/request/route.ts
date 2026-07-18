// Pide un código de acceso por email. Respuesta uniforme para no revelar
// qué correos tienen cuenta (el código sirve para entrar Y para crear cuenta).
import { NextResponse } from "next/server";
import { otpEnabled, requestLoginCode } from "@/lib/otp";

export async function POST(req: Request) {
  if (!otpEnabled()) {
    return NextResponse.json(
      { error: "El acceso con código no está configurado en esta instancia" },
      { status: 503 }
    );
  }
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  try {
    const r = await requestLoginCode(email);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 429 });
    return NextResponse.json({
      ok: true,
      ...(r.devCode ? { devCode: r.devCode } : {}),
    });
  } catch (e) {
    console.error("otp/request:", e);
    return NextResponse.json(
      { error: "No se pudo enviar el código. Probá de nuevo." },
      { status: 500 }
    );
  }
}
