"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusChip from "@/components/coach/StatusChip";
import { SIGNAL_LABEL } from "@/lib/signals";
import type { AthleteStatus, RosterEntry } from "@/lib/roster";

function lastLogLabel(days: number | null, hasLogs: boolean): string {
  if (!hasLogs) return "sin registros todavía";
  // Historial importado desde el skill: hay registros pero no fecha de
  // entrenamiento. Antes esto se leía como "sin registros" o, peor, como
  // "registró hoy" porque se usaba la fecha en que se tocó la fila.
  if (days === null) return "historial importado, sin fecha";
  if (days === 0) return "entrenó hoy";
  if (days === 1) return "entrenó ayer";
  return `hace ${days} días`;
}

type Filter = "todos" | "revisar" | "al-dia" | "sin-plan";

const FILTERS: { key: Filter; label: string; match: (r: RosterEntry) => boolean }[] = [
  { key: "todos", label: "Todos", match: () => true },
  {
    key: "revisar",
    label: "A revisar",
    match: (r) =>
      !!r.signal ||
      r.status === "inactivo" ||
      r.status === "atrasado" ||
      r.status === "bloque-terminado",
  },
  { key: "al-dia", label: "Al día", match: (r) => r.status === "al-dia" },
  { key: "sin-plan", label: "Sin plan", match: (r) => r.status === "sin-plan" },
];

/**
 * La lista de atletas, con buscador y filtro.
 *
 * Sin esto el panel era una lista plana sin orden útil: con dos decenas de
 * personas, los que necesitaban atención quedaban sepultados entre los que no.
 */
export default function RosterList({ roster }: { roster: RosterEntry[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    for (const f of FILTERS) c[f.key] = roster.filter(f.match).length;
    return c;
  }, [roster]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const byFilter = FILTERS.find((f) => f.key === filter)!.match;
    return roster.filter(
      (r) =>
        byFilter(r) &&
        (!needle ||
          (r.name ?? "").toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          (r.plan?.name ?? "").toLowerCase().includes(needle))
    );
  }, [roster, q, filter]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre, correo o bloque"
        className="h-11 w-full rounded-lg border border-line bg-card px-4 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-volt"
      />

      <div className="scrollbar-hide -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`h-9 shrink-0 rounded-lg border px-3 font-mono text-[11px] uppercase tracking-wider ${
              filter === f.key
                ? "border-volt bg-volt text-volt-ink font-semibold"
                : "border-line bg-card text-ink-3"
            }`}
          >
            {f.label} · {counts[f.key] ?? 0}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-3">
          Nadie acá con ese filtro.
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <Link
              key={r.id}
              href={`/coach/${r.id}`}
              className="block rounded-lg border border-line bg-card p-4 active:border-volt"
              style={r.signal ? { borderLeft: "3px solid var(--color-err, #FF6961)" } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {r.name ?? r.email}
                    {r.isSelf && (
                      <span className="ml-2 text-xs font-normal text-ink-3">(vos)</span>
                    )}
                    {r.role === "COACH" && (
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-volt">
                        coach
                      </span>
                    )}
                  </p>
                  <p className="truncate font-mono text-[11px] text-ink-3">{r.email}</p>
                </div>
                <StatusChip status={r.status as AthleteStatus} />
              </div>

              {/* Lo que el atleta escribió y nadie estaba leyendo */}
              {r.signal && (
                <p className="mt-2 rounded border border-err/30 bg-err/10 px-2.5 py-1.5 text-xs text-err">
                  <span className="font-semibold uppercase tracking-wide">
                    {SIGNAL_LABEL[r.signal.kind]}
                  </span>{" "}
                  · S{r.signal.week} · “{r.signal.text}”
                </p>
              )}

              <p className="mt-2 text-xs text-ink-2">
                {r.plan ? (
                  <>
                    {r.plan.name} · S{r.week}/{r.plan.weeks}
                    {r.sessionsPerWeek > 0 && (
                      <>
                        {" · "}
                        <span
                          className={
                            r.sessionsThisWeek >= r.sessionsPerWeek ? "text-ok" : "text-ink-2"
                          }
                        >
                          {r.sessionsThisWeek}/{r.sessionsPerWeek} sesiones esta semana
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  "Sin plan activo"
                )}
              </p>
              <p className="font-mono text-[11px] text-ink-3">
                {lastLogLabel(r.daysSinceLastLog, r.hasLogs)}
                {r.status === "bloque-terminado" && (
                  <span className="text-volt"> · publicale el bloque siguiente</span>
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
