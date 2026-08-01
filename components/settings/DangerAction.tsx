"use client";

import { useState } from "react";
import type { Result } from "@/lib/account-actions";
import { runAction } from "@/components/settings/SettingsCard";

/**
 * Acción destructiva con confirmación escrita. No hay `confirm()` del navegador
 * a propósito: en el PWA de iOS aparece sin contexto y se acepta por reflejo.
 */
export default function DangerAction({
  label,
  description,
  confirmWord,
  action,
  onDone,
}: {
  label: string;
  description: string;
  /** Palabra exacta que hay que escribir para habilitar el botón. */
  confirmWord: string;
  action: () => Promise<Result>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await runAction(action);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setInfo(r.info ?? "Listo.");
      setOpen(false);
      setTyped("");
      onDone?.();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded border border-err/30 bg-err/[0.06] p-3">
      <p className="font-display text-sm font-bold text-ink">{label}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{description}</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 h-10 rounded border border-err/50 px-4 font-display text-sm font-bold text-err active:bg-err/10"
        >
          {label}
        </button>
      ) : (
        <div className="mt-3">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
            Escribí <span className="text-err">{confirmWord}</span> para confirmar
          </p>
          <div className="flex gap-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 min-w-0 flex-1 rounded border border-line bg-bg px-3 text-[15px] uppercase tracking-widest text-ink outline-none focus:border-err"
            />
            <button
              onClick={run}
              disabled={busy || typed.trim().toUpperCase() !== confirmWord}
              className="h-11 shrink-0 rounded bg-err px-4 font-display text-sm font-bold text-bg disabled:bg-raised disabled:text-ink-3"
            >
              {busy ? "…" : "Confirmar"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTyped("");
              }}
              className="h-11 shrink-0 rounded border border-line-strong px-3 text-sm text-ink-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-err">{error}</p>}
      {info && <p className="mt-2 text-sm text-ok">{info}</p>}
    </div>
  );
}
