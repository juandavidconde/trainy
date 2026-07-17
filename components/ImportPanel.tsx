"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ImportPanel() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState<"plan" | "tracker">("plan");
  const [json, setJson] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setResult("❌ Eso no es JSON válido");
      return;
    }

    setBusy(true);
    try {
      const body =
        kind === "plan"
          ? { user_email: email, plan: parsed }
          : {
              user_email: email,
              data: (parsed as { data?: unknown }).data ?? parsed,
            };
      const res = await fetch(`/api/import/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setResult(`❌ ${data?.error ?? `Error ${res.status}`}`);
        return;
      }
      setResult(
        kind === "plan"
          ? `✅ Plan "${data.name}" importado para ${data.user}`
          : `✅ ${data.logsWritten} logs importados${
              data.skipped?.length ? ` · ${data.skipped.length} saltados` : ""
            }`
      );
      setJson("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-card p-4">
      <h2 className="text-sm font-bold">Importar desde el skill Trainy</h2>
      <p className="mt-1 text-xs text-ink-3">
        Pegá el <code>plan.json</code> (bloque nuevo) o un{" "}
        <code>tracker_*.json</code> (historial) generado por el skill.
      </p>

      <div className="mt-3 space-y-2">
        <div className="flex gap-1.5">
          {(["plan", "tracker"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-widest ${
                kind === k ? "bg-volt text-volt-ink" : "bg-bg text-ink-3"
              }`}
            >
              {k === "plan" ? "Plan" : "Tracker"}
            </button>
          ))}
        </div>
        <input
          type="email"
          placeholder="Email del atleta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 w-full rounded-lg border border-line bg-bg px-4 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-volt"
        />
        <textarea
          placeholder='{"nombre_bloque": …}'
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-line bg-bg px-4 py-2.5 font-mono text-xs text-ink outline-none placeholder:text-ink-3 focus:border-volt"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !email || !json}
          className="h-11 w-full rounded-lg bg-volt text-sm font-bold text-volt-ink active:bg-volt-pressed disabled:opacity-40"
        >
          {busy ? "Importando…" : "Importar"}
        </button>
        {result && <p className="text-xs">{result}</p>}
      </div>
    </div>
  );
}
