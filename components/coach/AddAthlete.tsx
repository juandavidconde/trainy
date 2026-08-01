"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addAthlete } from "@/lib/coach-actions";
import { runAction } from "@/components/settings/SettingsCard";

export default function AddAthlete() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await runAction(() => addAthlete(email, name));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setInfo(r.info ?? "Agregado.");
      setEmail("");
      setName("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const input =
    "h-11 w-full rounded border border-line bg-bg px-3 text-[15px] text-ink outline-none placeholder:text-ink-3/60 focus:border-volt";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-11 w-full rounded-lg border border-dashed border-line-strong font-display text-sm font-bold text-ink-2 active:bg-raised"
      >
        + Agregar atleta
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest">
        Agregar atleta
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-3">
        Con el correo alcanza. Queda listo para que le publiques el bloque desde
        el skill, y esa persona entra con ese mismo correo — con contraseña
        propia o con código.
      </p>
      <div className="mt-3 space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@empresa.com"
          className={input}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (opcional)"
          maxLength={80}
          className={input}
        />
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={busy || !email.trim()}
            className="h-11 flex-1 rounded bg-volt font-display text-sm font-bold text-volt-ink active:bg-volt-pressed disabled:bg-raised disabled:text-ink-3"
          >
            {busy ? "…" : "Agregar"}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              setError(null);
              setInfo(null);
            }}
            className="h-11 shrink-0 rounded border border-line-strong px-4 text-sm text-ink-2"
          >
            Cerrar
          </button>
        </div>
        {error && <p className="text-sm text-err">{error}</p>}
        {info && <p className="text-sm text-ok">{info}</p>}
      </div>
    </div>
  );
}
