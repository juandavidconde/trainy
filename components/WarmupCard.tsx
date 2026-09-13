import Link from "next/link";
import { Warmup } from "@/lib/prescription";

/**
 * Calentamiento de la sesión: movilidad general + las series de aproximación
 * sobre el compuesto pesado del día.
 *
 * Va arriba de los ejercicios porque hasta ahora las rutinas arrancaban en
 * frío: no había nada de calentamiento en ninguna pantalla de la app.
 */
export default function WarmupCard({
  warmup,
  accent,
}: {
  warmup: Warmup;
  accent: string;
}) {
  return (
    <details
      open
      className="group rounded-lg border border-line bg-card"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-volt">
            Calentamiento
          </p>
          <p className="mt-0.5 truncate font-sans font-semibold leading-snug">
            {warmup.sets.length} series de aproximación · {warmup.exercise}
          </p>
        </div>
        <span className="shrink-0 text-ink-3 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="border-t border-line px-4 py-3">
        <p className="text-xs text-ink-2">{warmup.general}</p>
        <div className="mt-3 space-y-1.5">
          {warmup.sets.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded border border-line bg-bg px-3 py-2"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[10px] text-ink-3">
                {i + 1}
              </span>
              <span className="flex-1 font-mono text-[13px] font-semibold text-ink">
                {s.scheme}
              </span>
              {s.weight && (
                <span className="font-mono text-[13px] text-volt">{s.weight}</span>
              )}
              <span className="shrink-0 font-mono text-[10px] text-ink-3">
                {s.rest}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          No se registran: son series para preparar el cuerpo, no cuentan como
          volumen.{" "}
          <Link href="/guide" className="text-volt underline-offset-4 hover:underline">
            Qué es una serie de aproximación
          </Link>
        </p>
      </div>
    </details>
  );
}
