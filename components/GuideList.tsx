"use client";

import { useState } from "react";
import ExerciseFigure from "@/components/ExerciseFigure";
import { MovementPattern } from "@/lib/exercise-pattern";
import { GLOSSARY } from "@/lib/glossary";

export interface GuideExercise {
  name: string;
  session: string;
  color: string;
  pattern: MovementPattern;
  progression: string | null;
  tempo: string | null;
  notes: string | null;
}

/** Render mínimo del markdown de la guía: **negrita** y viñetas. */
function GuideText({ text }: { text: string }) {
  return (
    <div className="space-y-1 text-sm leading-relaxed text-ink-2">
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, j) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={j} className="font-semibold text-ink">
              {p.slice(2, -2)}
            </strong>
          ) : (
            p
          )
        );
        if (line.trim().startsWith("- ")) {
          return (
            <p key={i} className="pl-4">
              <span className="text-volt">·</span> {rendered}
            </p>
          );
        }
        return line.trim() ? <p key={i}>{rendered}</p> : null;
      })}
    </div>
  );
}

function ExerciseCard({ ex }: { ex: GuideExercise }) {
  const [open, setOpen] = useState(false);
  const [howTo, setHowTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !howTo && !loading) {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch("/api/exercise-guide", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: ex.name }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error ?? "No se pudo cargar la guía");
        setHowTo(d.howTo);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando la guía");
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div
      className="rounded-lg border border-line bg-surface"
      style={{ borderLeftWidth: 3, borderLeftColor: ex.color }}
    >
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div className="shrink-0 text-ink-2" style={{ color: ex.color }}>
          <ExerciseFigure pattern={ex.pattern} className="h-12 w-[72px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{ex.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
            {ex.session}
            {ex.progression ? ` · ${ex.progression}` : ""}
            {ex.tempo ? ` · tempo ${ex.tempo}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`}
        >
          ›
        </span>
      </button>
      {open && (
        <div className="border-t border-line px-4 py-3">
          {ex.notes && (
            <p className="mb-2 text-sm italic text-ink-3">
              Nota de tu plan: {ex.notes}
            </p>
          )}
          {loading && (
            <p className="animate-pulse text-sm text-ink-3">
              El coach está escribiendo la guía…
            </p>
          )}
          {error && <p className="text-sm text-err">{error}</p>}
          {howTo && <GuideText text={howTo} />}
        </div>
      )}
    </div>
  );
}

export default function GuideList({ exercises }: { exercises: GuideExercise[] }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"ejercicios" | "diccionario">("ejercicios");

  const nq = q.trim().toLowerCase();
  const filteredEx = exercises.filter((e) => e.name.toLowerCase().includes(nq));
  const filteredGl = GLOSSARY.filter(
    (g) =>
      g.term.toLowerCase().includes(nq) ||
      (g.aka ?? "").toLowerCase().includes(nq) ||
      g.def.toLowerCase().includes(nq)
  );

  return (
    <div className="space-y-4 md:mx-auto md:max-w-2xl">
      <h1 className="font-display text-xl font-bold">Guía</h1>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("ejercicios")}
          className={`h-11 flex-1 rounded-lg border font-display text-sm font-bold uppercase tracking-wider ${
            tab === "ejercicios"
              ? "border-volt/40 bg-volt/10 text-volt"
              : "border-line bg-card text-ink-3"
          }`}
        >
          Tus ejercicios
        </button>
        <button
          onClick={() => setTab("diccionario")}
          className={`h-11 flex-1 rounded-lg border font-display text-sm font-bold uppercase tracking-wider ${
            tab === "diccionario"
              ? "border-volt/40 bg-volt/10 text-volt"
              : "border-line bg-card text-ink-3"
          }`}
        >
          Diccionario
        </button>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={
          tab === "ejercicios" ? "Buscar ejercicio..." : "Buscar término..."
        }
        className="h-11 w-full rounded-lg border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-volt"
      />

      {tab === "ejercicios" && (
        <div className="space-y-2">
          {exercises.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-3">
              Sin plan activo — cuando tengas tu bloque, acá aparece cada
              ejercicio con su técnica.
            </p>
          )}
          {filteredEx.map((ex) => (
            <ExerciseCard key={ex.name} ex={ex} />
          ))}
          {exercises.length > 0 && filteredEx.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-3">
              Nada con “{q}”.
            </p>
          )}
          <p className="pt-2 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
            Tocá un ejercicio para ver la técnica
          </p>
        </div>
      )}

      {tab === "diccionario" && (
        <div className="space-y-2">
          {filteredGl.map((g) => (
            <details
              key={g.term}
              className="group rounded-lg border border-line bg-surface"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between p-3 [&::-webkit-details-marker]:hidden">
                <span className="font-semibold text-ink">
                  {g.term}
                  {g.aka && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                      {g.aka}
                    </span>
                  )}
                </span>
                <span className="text-ink-3 transition-transform group-open:rotate-90">
                  ›
                </span>
              </summary>
              <div className="border-t border-line px-4 py-3 text-sm leading-relaxed text-ink-2">
                <p>{g.def}</p>
                {g.example && (
                  <p className="mt-2 rounded border border-line bg-bg px-3 py-2 font-mono text-xs text-ink-3">
                    {g.example}
                  </p>
                )}
              </div>
            </details>
          ))}
          {filteredGl.length === 0 && (
            <p className="py-8 text-center text-sm text-ink-3">
              Nada con “{q}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
