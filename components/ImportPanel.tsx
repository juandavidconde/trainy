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
    <div className="rounded-2xl border border-neutral-800 bg-card p-4">
      <h2 className="text-sm font-bold">Importar desde el skill Trainy</h2>
      <p className="mt-1 text-xs text-neutral-500">
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
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                kind === k ? "bg-accent text-white" : "bg-surface text-neutral-400"
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
          className="w-full rounded-xl border border-neutral-800 bg-surface px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <textarea
          placeholder='{"nombre_bloque": …}'
          value={json}
          onChange={(e) => setJson(e.target.value)}
          rows={6}
          className="w-full rounded-xl border border-neutral-800 bg-surface px-4 py-2.5 font-mono text-xs outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !email || !json}
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Importando…" : "Importar"}
        </button>
        {result && <p className="text-xs">{result}</p>}
      </div>
    </div>
  );
}
