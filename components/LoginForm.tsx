"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { checkEmail } from "@/lib/email";

// "recover" existe para que NUNCA haya un callejón sin salida: si la instancia
// no tiene Resend configurado no se puede mandar un código, pero el coach sí
// puede generar una clave temporal desde su panel. Antes, quien olvidaba la
// contraseña simplemente no tenía a dónde ir — y no volvía.
type Mode = "login" | "register" | "code" | "recover";

export default function LoginForm({
  googleEnabled,
  otpEnabled,
  initialMode = "login",
  refCode,
}: {
  googleEnabled: boolean;
  otpEnabled: boolean;
  /** "register" cuando se llega desde el botón de la landing (`?nuevo=1`). */
  initialMode?: Mode;
  /** Canal por el que llegó el atleta (`?ref=`), para medir de dónde vienen. */
  refCode?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
    setSuggestion(null);
    setCodeSent(false);
    setCode("");
  }

  /** El botón de recuperar lleva al código si se puede, y si no, a la salida real. */
  function startRecovery() {
    switchMode(otpEnabled ? "code" : "recover");
  }

  async function requestCode() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "No se pudo enviar el código");
        return;
      }
      setCodeSent(true);
      setInfo(
        data?.devCode
          ? `Código (solo dev): ${data.devCode}`
          : "Te enviamos un código de 6 dígitos al correo. Vence en 10 minutos."
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuggestion(null);
    setBusy(true);
    try {
      if (mode === "code") {
        if (!codeSent) return requestCode();
        const result = await signIn("otp", { email, code, redirect: false });
        if (result?.error) {
          setError("Código incorrecto o vencido");
          return;
        }
        router.push("/today");
        router.refresh();
        return;
      }
      if (mode === "register") {
        // Se valida en el cliente para dar la corrección antes de crear nada,
        // y otra vez en el servidor porque el cliente no es una garantía.
        const check = checkEmail(email);
        if (!check.ok) {
          setError(check.error ?? "Revisá tu correo");
          setSuggestion(check.suggestion ?? null);
          return;
        }
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, ref: refCode }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "No se pudo crear la cuenta");
          setSuggestion(data?.suggestion ?? null);
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email o contraseña incorrectos");
        return;
      }
      router.push(mode === "register" ? "/onboarding" : "/today");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-card px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-volt focus:bg-raised";

  const cta =
    mode === "login"
      ? "Entrar"
      : mode === "register"
        ? "Crear cuenta"
        : codeSent
          ? "Entrar con código"
          : "Enviarme un código";

  // ── Recuperación sin correo configurado ─────────────────────
  if (mode === "recover") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 rounded-lg border border-line bg-card p-5">
          <h2 className="font-display text-lg font-bold">Recuperar tu cuenta</h2>
          <p className="text-sm leading-relaxed text-ink-2">
            Esta instancia todavía no manda códigos por correo, así que la clave la
            reestablece tu coach: la genera en un toque desde su panel y te la pasa.
          </p>
          <ol className="space-y-2 text-sm text-ink-2">
            <li className="flex gap-2.5">
              <span className="font-mono text-xs text-volt">1</span>
              <span>Escribile a tu coach y pedile una clave temporal.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-xs text-volt">2</span>
              <span>
                Decile con qué correo entrás
                {email.trim() && (
                  <>
                    {" — "}
                    <span className="font-mono text-ink">{email.trim()}</span>
                  </>
                )}
                .
              </span>
            </li>
            <li className="flex gap-2.5">
              <span className="font-mono text-xs text-volt">3</span>
              <span>Entrá con esa clave y cambiala en Ajustes.</span>
            </li>
          </ol>
        </div>
        <button
          onClick={() => switchMode("login")}
          className="h-12 w-full rounded-lg border border-line-strong text-ink-2 active:bg-raised"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <button
            onClick={() => signIn("google", { callbackUrl: "/today" })}
            className="w-full rounded-lg bg-ink py-3 font-semibold text-bg active:scale-[0.98]"
          >
            Entrar con Google
          </button>
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <div className="h-px flex-1 bg-line" />
            o con email
            <div className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submit} className="space-y-3">
        {mode === "register" && (
          <input
            type="text"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          disabled={mode === "code" && codeSent}
        />
        {mode === "register" && (
          <p className="text-xs leading-relaxed text-ink-3">
            Con este correo entrás y tu coach te publica los bloques. Revisá que esté bien escrito.
          </p>
        )}
        {mode !== "code" && (
          <input
            type="password"
            required
            minLength={8}
            placeholder={mode === "register" ? "Contraseña (mín. 8)" : "Contraseña"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        )}
        {mode === "code" && codeSent && (
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            placeholder="Código de 6 dígitos"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className={`${inputCls} text-center font-mono text-xl tracking-[0.5em]`}
            autoFocus
          />
        )}
        {info && <p className="text-sm text-ink-2">{info}</p>}
        {error && <p className="text-sm text-err">{error}</p>}
        {suggestion && (
          <button
            type="button"
            onClick={() => {
              setEmail(suggestion);
              setError(null);
              setSuggestion(null);
            }}
            className="w-full rounded-lg border border-volt/40 bg-volt/10 px-3 py-2 text-sm text-volt"
          >
            Usar {suggestion}
          </button>
        )}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-lg bg-volt font-display font-bold text-volt-ink shadow-glow active:scale-[0.98] active:bg-volt-pressed disabled:opacity-50"
        >
          {busy ? "…" : cta}
        </button>
        {mode === "code" && codeSent && (
          <button
            type="button"
            onClick={requestCode}
            disabled={busy}
            className="w-full text-center text-xs text-ink-3 underline-offset-4 hover:underline"
          >
            Reenviar código
          </button>
        )}
      </form>

      <div className="space-y-2 pt-1 text-center text-sm">
        {/* Siempre presente: es la única salida de quien no puede entrar. */}
        {mode !== "code" && (
          <button
            onClick={startRecovery}
            className="w-full text-ink-2 underline-offset-4 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        )}
        <button
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
          className="w-full text-ink-2 underline-offset-4 hover:underline"
        >
          {mode === "login" || mode === "code"
            ? "¿Primera vez? Crear cuenta"
            : "Ya tengo cuenta — entrar"}
        </button>
        {mode === "code" && (
          <button
            onClick={() => switchMode("login")}
            className="w-full text-ink-3 underline-offset-4 hover:underline"
          >
            Volver al login con contraseña
          </button>
        )}
      </div>
    </div>
  );
}
