"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
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
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Email o contraseña incorrectos");
        return;
      }
      router.push("/today");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-card px-4 py-3 text-ink outline-none placeholder:text-ink-3 focus:border-volt focus:bg-raised";

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
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Contraseña (mín. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
        />
        {error && <p className="text-sm text-err">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="h-12 w-full rounded-lg bg-volt font-display font-bold text-volt-ink shadow-glow active:scale-[0.98] active:bg-volt-pressed disabled:opacity-50"
        >
          {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="w-full text-center text-sm text-ink-2 underline-offset-4 hover:underline"
      >
        {mode === "login"
          ? "¿Primera vez? Crear cuenta"
          : "Ya tengo cuenta — entrar"}
      </button>
    </div>
  );
}
