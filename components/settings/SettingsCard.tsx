import { ReactNode } from "react";

/** Clases compartidas por los formularios de Ajustes. */
export const settingsInput =
  "h-11 w-full rounded border border-line bg-bg px-3 text-[15px] text-ink outline-none placeholder:text-ink-3/60 focus:border-volt";

export const settingsLabel =
  "mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3";

export const settingsButton =
  "h-11 shrink-0 rounded bg-volt px-5 font-display text-sm font-bold text-volt-ink active:bg-volt-pressed disabled:bg-raised disabled:text-ink-3";

export const settingsGhostButton =
  "h-11 shrink-0 rounded border border-line-strong px-4 font-display text-sm font-bold text-ink-2 active:bg-raised disabled:text-ink-3";

export default function SettingsCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface p-4">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-ink">
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-3">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * Corre una server action y nunca deja la pantalla muda: si la acción explota
 * (base caída, red cortada en el gimnasio), devuelve un error mostrable en vez
 * de que el click parezca no haber hecho nada.
 */
export async function runAction<T extends { ok: boolean }>(
  fn: () => Promise<T>
): Promise<T | { ok: false; error: string }> {
  try {
    return await fn();
  } catch {
    return {
      ok: false,
      error: "No se pudo completar. Revisá tu conexión y probá de nuevo.",
    };
  }
}

/** Mensaje de resultado de una acción (éxito o error). */
export function Feedback({
  error,
  info,
}: {
  error?: string | null;
  info?: string | null;
}) {
  if (error) return <p className="mt-2 text-sm text-err">{error}</p>;
  if (info) return <p className="mt-2 text-sm text-ok">{info}</p>;
  return null;
}
