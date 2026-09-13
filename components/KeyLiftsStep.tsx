"use client";

import ExerciseFigure from "@/components/ExerciseFigure";
import { KEY_LIFTS, LiftMarks } from "@/lib/key-lifts";

/**
 * Paso de marcas del onboarding.
 *
 * Antes era un textarea con el ejemplo "Banca 8×135 lb": pedía jerga que la
 * mitad de la gente no tiene, así que se saltaba y el bloque salía con pesos
 * estimados. Ahora cada ejercicio se explica y solo hay que llenar dos
 * casillas — o decir que nunca lo hiciste, que también es información útil.
 */
export default function KeyLiftsStep({
  marks,
  onChange,
}: {
  marks: LiftMarks;
  onChange: (key: string, patch: Partial<LiftMarks[string]>) => void;
}) {
  const numCls =
    "h-11 w-full min-w-0 rounded border border-line bg-bg px-2 text-center font-mono text-[15px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-ink-3/60 focus:border-volt";

  return (
    <div className="space-y-2">
      {KEY_LIFTS.map((lift) => {
        const m = marks[lift.key] ?? { reps: "", lb: "" };
        const off = !!m.unknown;
        return (
          <div
            key={lift.key}
            className={`rounded-lg border p-3 transition-opacity ${
              off ? "border-line bg-surface/50 opacity-55" : "border-line bg-surface"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-volt">
                <ExerciseFigure pattern={lift.pattern} className="h-11 w-[66px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight text-ink">{lift.name}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {lift.aka}
                </p>
              </div>
            </div>

            <p className="mt-2 text-[13px] leading-snug text-ink-2">{lift.what}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
              {lift.muscles}
            </p>

            {!off && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
                    Repeticiones
                  </span>
                  <input
                    value={m.reps}
                    onChange={(e) => onChange(lift.key, { reps: e.target.value })}
                    inputMode="numeric"
                    placeholder={lift.bodyweight ? "8" : "10"}
                    maxLength={4}
                    className={numCls}
                  />
                </label>
                {lift.bodyweight ? (
                  <div className="flex flex-col justify-end">
                    <p className="pb-3 font-mono text-[11px] text-ink-3">
                      con tu propio peso
                    </p>
                  </div>
                ) : (
                  <label className="block">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      Peso aprox. (lb)
                    </span>
                    <input
                      value={m.lb}
                      onChange={(e) => onChange(lift.key, { lb: e.target.value })}
                      inputMode="decimal"
                      placeholder={lift.hint}
                      maxLength={6}
                      className={numCls}
                    />
                  </label>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                onChange(lift.key, off ? { unknown: false } : { unknown: true, reps: "", lb: "" })
              }
              className="mt-2 font-mono text-[11px] uppercase tracking-wider text-ink-3 underline-offset-4 hover:text-ink-2 hover:underline"
            >
              {off ? "↺ sí lo he hecho" : "Nunca lo he hecho"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
