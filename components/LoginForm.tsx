"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

type Mode = "login" | "register" | "code";

export default function LoginForm({
  googleEnabled,
  otpEnabled,
}: {
  googleEnabled: boolean;
  otpEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setInfo(null);
    setCodeSent(false);
    setCode("");
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
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "No se pudo crear la cuenta");
          return;
        }
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError("Email o contraseña incorrectos");
        return;
      }
      // Cuenta nueva → directo al onboarding; login normal → Hoy
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
        <button
          onClick={() => switchMode(mode === "login" ? "register" : "login")}
          className="w-full text-ink-2 underline-offset-4 hover:underline"
        >
          {mode === "login" || mode === "code"
            ? "¿Primera vez? Crear cuenta"
            : "Ya tengo cuenta — entrar"}
        </button>
        {otpEnabled && mode !== "code" && (
          <button
            onClick={() => switchMode("code")}
            className="w-full text-ink-3 underline-offset-4 hover:underline"
          >
            Entrar con código al correo (sin contraseña)
          </button>
        )}
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
