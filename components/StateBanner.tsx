"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resumeAtWeek } from "@/lib/account-actions";
import type { AthleteState } from "@/lib/athlete-state";
import type { CommentSignal } from "@/lib/signals";
import { SIGNAL_LABEL } from "@/lib/signals";

/**
 * El primer bloque de contenido de Hoy: lo único que la persona necesita saber
 * antes de mirar los ejercicios. Reemplaza el "Hoy toca DESCANSO 💤" que recibía
 * a todo el mundo, incluido a quien acababa de generar su bloque hace 30
 * segundos y todavía no había registrado una sola serie.
 */
export default function StateBanner({
  state,
  isRestDay,
  restLabel,
  firstSessionName,
  firstSessionHref,
  signals,
}: {
  state: AthleteState;
  isRestDay: boolean;
  restLabel: string | null;
  firstSessionName: string;
  firstSessionHref: string;
  signals: CommentSignal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dismissedPause, setDismissedPause] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card = "rounded-lg border px-4 py-3 text-sm";

  function resume(week: number) {
    setError(null);
    startTransition(async () => {
      const res = await resumeAtWeek(week);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  // ── Bloque terminado ────────────────────────────────────────
  // Antes esto no existía: pasadas las 12 semanas la app seguía mostrando S12
  // indefinidamente y en el panel del coach el atleta figuraba "al día".
  if (state.phase === "terminado") {
    return (
      <div className={`${card} border-volt/40 bg-volt/[0.08]`}>
        <p className="font-display text-base font-bold text-ink">
          Terminaste el bloque 🏆
        </p>
        <p className="mt-1 text-ink-2">
          Pasaron las {state.elapsed - 1} semanas del plan. Mirá lo que conseguiste y
          armá el siguiente.
        </p>
        <Link
          href="/cierre"
          className="mt-3 inline-flex h-11 items-center rounded-lg bg-volt px-5 font-display font-bold text-volt-ink shadow-glow active:bg-volt-pressed"
        >
          Ver mi resumen
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* ── Señales de dolor ───────────────────────────────── */}
      {signals.length > 0 && (
        <div className={`${card} border-err/40 bg-err/10`}>
          <p className="font-semibold text-err">
            Anotaste {SIGNAL_LABEL[signals[0].kind]}
            {signals[0].exerciseName && ` en ${signals[0].exerciseName}`}
          </p>
          <p className="mt-1 text-ink-2">
            “{signals[0].text}” · S{signals[0].week}
            {signals.length > 1 && ` · y ${signals.length - 1} aviso(s) más`}
          </p>
          <p className="mt-1.5 text-xs text-ink-3">
            Si sigue, bajá la carga y escribile a tu coach antes de forzar.
          </p>
        </div>
      )}

      {/* ── Vuelve tras una pausa ──────────────────────────── */}
      {state.pausedGap && !dismissedPause && (
        <div className={`${card} border-warn/40 bg-warn/10`}>
          <p className="font-semibold text-ink">
            {state.pausedGap.days !== null
              ? `Estuviste ${state.pausedGap.days} días sin registrar`
              : `Te quedaron ${state.pausedGap.weeks} ${
                  state.pausedGap.weeks === 1 ? "semana" : "semanas"
                } sin registrar`}
          </p>
          <p className="mt-1 text-ink-2">
            La app te tiene en S{state.week}, pero tu último registro fue en S
            {state.lastLoggedWeek}. Retomá donde quedaste y volvé a subir desde ahí —
            los pesos de S{state.week} son para quien no paró.
          </p>
          {error && <p className="mt-1 text-xs text-err">{error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => resume(state.pausedGap!.resumeWeek)}
              disabled={pending}
              className="h-11 rounded-lg bg-volt px-4 font-display font-bold text-volt-ink active:bg-volt-pressed disabled:opacity-50"
            >
              {pending ? "…" : `Retomar en S${state.pausedGap.resumeWeek}`}
            </button>
            <button
              onClick={() => setDismissedPause(true)}
              className="h-11 rounded-lg border border-line-strong px-4 text-ink-2 active:bg-raised"
            >
              Seguir en S{state.week}
            </button>
          </div>
        </div>
      )}

      {/* ── Todavía no registró nada: el día 0 ─────────────── */}
      {state.phase === "sin-empezar" ? (
        <div className={`${card} border-volt/40 bg-volt/[0.08]`}>
          <p className="font-display text-base font-bold text-ink">
            Tu bloque está listo
          </p>
          <p className="mt-1 text-ink-2">
            {isRestDay && restLabel
              ? `Tu calendario marca ${restLabel} para hoy, pero la sesión 1 te espera cuando quieras arrancar.`
              : "Arrancá cuando quieras: marcá cada serie con el ✓ y se guarda solo."}
          </p>
          <Link
            href={firstSessionHref}
            className="mt-3 inline-flex h-11 items-center rounded-lg bg-volt px-5 font-display font-bold text-volt-ink shadow-glow active:bg-volt-pressed"
          >
            Empezar {firstSessionName}
          </Link>
        </div>
      ) : (
        isRestDay &&
        restLabel && (
          <div className={`${card} border-line bg-card text-ink-2`}>
            Hoy toca <span className="font-semibold text-ink">{restLabel}</span> según tu
            calendario. Si igual entrenás, elegí la sesión abajo. 💤
          </div>
        )
      )}
    </div>
  );
}
