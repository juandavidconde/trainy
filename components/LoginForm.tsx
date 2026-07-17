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

  return (
    <div className="space-y-4">
      {googleEnabled && (
        <>
          <button
            onClick={() => signIn("google", { callbackUrl: "/today" })}
            className="w-full rounded-xl bg-white py-3 font-semibold text-neutral-900 active:scale-[0.98]"
          >
            Entrar con Google
          </button>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="h-px flex-1 bg-neutral-800" />
            o con email
            <div className="h-px flex-1 bg-neutral-800" />
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
            className="w-full rounded-xl border border-neutral-800 bg-card px-4 py-3 outline-none focus:border-accent"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-neutral-800 bg-card px-4 py-3 outline-none focus:border-accent"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="Contraseña (mín. 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-neutral-800 bg-card px-4 py-3 outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white disabled:opacity-50 active:scale-[0.98]"
        >
          {busy ? "…" : mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="w-full text-center text-sm text-neutral-400 underline-offset-4 hover:underline"
      >
        {mode === "login"
          ? "¿Primera vez? Crear cuenta"
          : "Ya tengo cuenta — entrar"}
      </button>
    </div>
  );
}
