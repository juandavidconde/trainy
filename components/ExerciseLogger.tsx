"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveLog, SetInput } from "@/lib/actions";

const EMPTY: SetInput = { reps: "", weight: "", rpe: "", done: false };

function emptyRows(n: number): SetInput[] {
  return Array.from({ length: Math.max(n, 1) }, () => ({ ...EMPTY }));
}

export default function ExerciseLogger({
  exerciseId,
  week,
  progression,
  initialSets,
  initialComment,
  prevSets,
}: {
  exerciseId: string;
  week: number;
  progression: string | null;
  initialSets: SetInput[];
  initialComment: string;
  prevSets: SetInput[];
}) {
  const [sets, setSets] = useState<SetInput[]>(
    initialSets.length > 0 ? initialSets : emptyRows(prevSets.length || 3)
  );
  const [comment, setComment] = useState(initialComment);
  const [status, setStatus] = useState<"idle" | "dirty" | "saving" | "saved" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ sets, comment });
  latest.current = { sets, comment };

  function doSave() {
    setStatus("saving");
    setErrorMsg(null);
    startTransition(async () => {
      const { sets: s, comment: c } = latest.current;
      const res = await saveLog(exerciseId, week, s, c);
      if (res.ok) {
        setStatus("saved");
      } else {
        setStatus("error");
        setErrorMsg(res.error ?? "Error guardando");
      }
    });
  }

  function markDirty() {
    setStatus("dirty");
    if (timer.current) clearTimeout(timer.current);
    // Autosave 2.5s después del último cambio
    timer.current = setTimeout(doSave, 2500);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function update(i: number, patch: Partial<SetInput>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
    markDirty();
  }

  function toggleDone(i: number) {
    const willBeDone = !sets[i].done;
    // Si marca done una fila vacía, copiar la referencia de la semana pasada
    setSets((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        const next = { ...s, done: willBeDone };
        if (willBeDone && !s.reps && !s.weight && prevSets[idx]) {
          next.reps = prevSets[idx].reps;
          next.weight = prevSets[idx].weight;
        }
        return next;
      })
    );
    markDirty();
    if (willBeDone) {
      window.dispatchEvent(
        new CustomEvent("trainy:set-done", { detail: { progression } })
      );
    }
  }

  const inputCls =
    "h-11 min-w-0 rounded-lg border border-neutral-800 bg-surface px-1 text-center outline-none focus:border-accent md:h-10 md:text-sm";

  return (
    <div className="mt-3 space-y-2">
      <div className="grid grid-cols-[1fr_1fr_3.2rem_2.9rem_1.4rem] items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
        <span>Reps</span>
        <span>Peso</span>
        <span>RPE</span>
        <span className="text-center">✓</span>
        <span />
      </div>
      {sets.map((s, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_1fr_3.2rem_2.9rem_1.4rem] items-center gap-1.5"
        >
          <input
            value={s.reps}
            onChange={(e) => update(i, { reps: e.target.value })}
            inputMode="decimal"
            placeholder={prevSets[i]?.reps || "reps"}
            className={inputCls}
          />
          <input
            value={s.weight}
            onChange={(e) => update(i, { weight: e.target.value })}
            inputMode="decimal"
            placeholder={prevSets[i]?.weight || "peso"}
            className={inputCls}
          />
          <input
            value={s.rpe}
            onChange={(e) => update(i, { rpe: e.target.value })}
            inputMode="decimal"
            placeholder={prevSets[i]?.rpe || "—"}
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => toggleDone(i)}
            className={`mx-auto flex h-11 w-11 items-center justify-center rounded-lg border text-base md:h-10 md:w-10 ${
              s.done
                ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                : "border-neutral-700 text-neutral-600 active:border-neutral-500"
            }`}
            aria-label={s.done ? "Serie completada" : "Marcar serie completada"}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => {
              setSets((prev) =>
                prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
              );
              markDirty();
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
          onClick={() => {
            setSets((prev) => [...prev, { ...EMPTY }]);
          }}
          className="h-9 shrink-0 rounded-lg border border-dashed border-neutral-700 px-3 text-xs text-neutral-400"
        >
          + serie
        </button>
        <input
          value={comment}
          onChange={(e) => {
            setComment(e.target.value);
            markDirty();
          }}
          placeholder="Comentario…"
          className="h-9 min-w-0 flex-1 rounded-lg border border-neutral-800 bg-surface px-3 outline-none focus:border-accent md:text-xs"
        />
        <button
          type="button"
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            doSave();
          }}
          className={`h-9 shrink-0 rounded-lg px-4 text-xs font-bold ${
            status === "saved"
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-accent text-white"
          }`}
        >
          {status === "saving" ? "…" : status === "saved" ? "✓ Guardado" : "Guardar"}
        </button>
      </div>
      {status === "error" && <p className="text-xs text-red-400">{errorMsg}</p>}
      {status === "dirty" && (
        <p className="text-right text-[10px] text-neutral-600">guardando en unos segundos…</p>
      )}
    </div>
  );
}
