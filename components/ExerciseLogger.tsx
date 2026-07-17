"use client";

import { useState, useTransition } from "react";
import { saveLog, SetInput } from "@/lib/actions";

const EMPTY: SetInput = { reps: "", weight: "", rpe: "", done: false };

export default function ExerciseLogger({
  exerciseId,
  week,
  initialSets,
  initialComment,
}: {
  exerciseId: string;
  week: number;
  initialSets: SetInput[];
  initialComment: string;
}) {
  const [sets, setSets] = useState<SetInput[]>(
    initialSets.length > 0 ? initialSets : [EMPTY, EMPTY, EMPTY]
  );
  const [comment, setComment] = useState(initialComment);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(i: number, patch: Partial<SetInput>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    setSaved(false);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveLog(exerciseId, week, sets, comment);
      if (res.ok) {
        setSaved(true);
      } else {
        setError(res.error ?? "Error guardando");
      }
    });
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-[1fr_1fr_3.5rem_2.5rem_1.5rem] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        <span>Reps</span>
        <span>Peso</span>
        <span>RPE</span>
        <span className="text-center">✓</span>
        <span />
      </div>
      {sets.map((s, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_3.5rem_2.5rem_1.5rem] items-center gap-1.5"
        >
          <input
            value={s.reps}
            onChange={(e) => update(i, { reps: e.target.value })}
            inputMode="decimal"
            placeholder="reps"
            className="rounded-lg border border-neutral-800 bg-surface px-2 py-2 text-center text-sm outline-none focus:border-accent"
          />
          <input
            value={s.weight}
            onChange={(e) => update(i, { weight: e.target.value })}
            inputMode="decimal"
            placeholder="kg"
            className="rounded-lg border border-neutral-800 bg-surface px-2 py-2 text-center text-sm outline-none focus:border-accent"
          />
          <input
            value={s.rpe}
            onChange={(e) => update(i, { rpe: e.target.value })}
            inputMode="decimal"
            placeholder="—"
            className="rounded-lg border border-neutral-800 bg-surface px-2 py-2 text-center text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={() => update(i, { done: !s.done })}
            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${
              s.done
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-neutral-700 text-neutral-600"
            }`}
            aria-label="Serie completada"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setSets((prev) => prev.filter((_, idx) => idx !== i));
              setSaved(false);
            }}
            className="text-center text-neutral-600 hover:text-red-400"
            aria-label="Quitar serie"
          >
            ×
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSets((prev) => [...prev, EMPTY])}
          className="rounded-lg border border-dashed border-neutral-700 px-3 py-1.5 text-xs text-neutral-400"
        >
          + serie
        </button>
        <input
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            setSaved(false);
          }}
          placeholder="Comentario…"
          className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-surface px-3 py-1.5 text-xs outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={`rounded-lg px-4 py-1.5 text-xs font-bold ${
            saved
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-accent text-white"
          } disabled:opacity-50`}
        >
          {pending ? "…" : saved ? "✓" : "Guardar"}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
