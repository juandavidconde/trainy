import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { buildBlockSummary } from "@/lib/block-summary";
import { aiCoachEnabled } from "@/lib/coach-ai";

/**
 * Cierre de bloque: la pantalla que faltaba.
 *
 * La semana 12 es el único momento del ciclo en que el atleta tiene evidencia
 * acumulada de que esto funcionó — y era el momento en que la app se quedaba
 * callada. Acá se le muestra qué consiguió y se le abre la puerta al bloque
 * siguiente, que es donde vive la renovación.
 */
export default async function CierrePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const summary = await buildBlockSummary(user.id);
  if (!summary) redirect("/today");

  const adherence = Math.round(summary.adherencePct);
  const nunca = summary.sessionsDone === 0;

  return (
    <div className="space-y-5 pb-4 md:mx-auto md:max-w-2xl">
      <div className="text-center">
        <p className="font-display text-4xl">{nunca ? "🗓️" : "🏆"}</p>
        <h1 className="mt-2 font-display text-2xl font-bold">
          {nunca ? "Se cerró el bloque" : "Terminaste el bloque"}
        </h1>
        <p className="mt-1 text-sm text-ink-2">
          {summary.planName} · {summary.weeks} semanas
        </p>
      </div>

      {nunca ? (
        <div className="rounded-lg border border-line bg-card px-4 py-4 text-sm text-ink-2">
          Pasaron las {summary.weeks} semanas y no quedó ningún registro de este bloque.
          No pasa nada — lo importante es el que viene. Armá uno nuevo con la fecha de
          hoy y arrancá de cero.
        </div>
      ) : (
        <>
          {/* Números del bloque */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { n: `${adherence}%`, l: "adherencia" },
              { n: String(summary.sessionsDone), l: `de ${summary.sessionsPlanned} sesiones` },
              { n: String(summary.totalSets), l: "series marcadas" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-lg border border-line bg-card px-3 py-3 text-center"
              >
                <p className="font-display text-2xl font-bold tabular text-volt">{s.n}</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {s.l}
                </p>
              </div>
            ))}
          </div>

          {summary.topGains.length > 0 ? (
            <div className="space-y-2">
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-ink-3">
                Dónde más subiste
              </h2>
              {summary.topGains.map((g) => (
                <div
                  key={`${g.sessionName}-${g.name}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold leading-snug">{g.name}</p>
                    <p className="font-mono text-[11px] text-ink-3">
                      S{g.firstWeek}: {g.firstLabel} → S{g.bestWeek}: {g.best}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-lg font-bold tabular text-ok">
                    +{Math.round(g.gainPct ?? 0)}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-card px-4 py-3 text-sm text-ink-2">
              No hay suficientes registros comparables para medir progresión. En el
              próximo bloque, anotá reps y peso en cada serie y acá vas a ver la curva.
            </div>
          )}

          {summary.gains.length > summary.topGains.length && (
            <details className="rounded-lg border border-line bg-card px-4 py-3">
              <summary className="cursor-pointer text-sm text-volt">
                Ver los {summary.gains.length} ejercicios
              </summary>
              <div className="mt-3 space-y-1.5">
                {summary.gains.map((g) => (
                  <div
                    key={`all-${g.sessionName}-${g.name}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate text-ink-2">{g.name}</span>
                    <span className="shrink-0 font-mono text-[11px] text-ink-3">
                      mejor {g.best} · S{g.bestWeek}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {/* La única razón de ser de esta pantalla: que haya un bloque 2 */}
      <div className="space-y-2 pt-1">
        {aiCoachEnabled() && (
          <Link
            href="/onboarding"
            className="flex h-12 w-full items-center justify-center rounded-lg bg-volt font-display font-bold text-volt-ink shadow-glow active:bg-volt-pressed"
          >
            Armar el bloque 2
          </Link>
        )}
        <p className="text-center text-xs leading-relaxed text-ink-3">
          {aiCoachEnabled()
            ? "Tu perfil ya está cargado: son dos toques. Si tu bloque lo arma tu coach, escribile y él te lo publica acá."
            : "Escribile a tu coach para que te publique el bloque siguiente."}
        </p>
        <Link
          href="/today"
          className="flex h-11 w-full items-center justify-center rounded-lg border border-line-strong text-ink-2 active:bg-raised"
        >
          Seguir con este bloque
        </Link>
        <Link
          href="/settings"
          className="block pt-1 text-center text-xs text-ink-3 underline-offset-4 hover:underline"
        >
          Repetir este mismo plan desde la semana 1
        </Link>
      </div>
    </div>
  );
}
