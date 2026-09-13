"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setScheduleMode } from "@/lib/actions";

type Mode = "CALENDAR" | "FLEXIBLE";

const OPCIONES: { value: Mode; title: string; desc: string }[] = [
  {
    value: "FLEXIBLE",
    title: "Flexible",
    desc: "Todo día es día de entrenar. La app te ofrece la siguiente sesión que te falta del ciclo, sin importar qué día sea.",
  },
  {
    value: "CALENDAR",
    title: "Calendario fijo",
    desc: "Cada sesión tiene su día. Si hoy no toca, la app te lo marca como descanso.",
  },
];

/**
 * Elegir entre los dos modos de agenda.
 *
 * Existe porque el calendario del plan lo escribe quien diseña el bloque y
 * hasta ahora no había forma de que el atleta lo discutiera: un domingo libre
 * salía como "hoy toca DESCANSO" aunque estuviera en el gym.
 */
export default function ScheduleModeSection({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [current, setCurrent] = useState<Mode>(mode);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(m: Mode) {
    if (m === current || pending) return;
    const prev = current;
    setCurrent(m); // optimista: el toggle responde antes que el server
    setError(null);
    startTransition(async () => {
      const res = await setScheduleMode(m);
      if (!res.ok) {
        setCurrent(prev);
        setError(res.error ?? "No se pudo guardar");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-display text-sm font-bold uppercase tracking-widest">
        Tus días
      </p>
      <p className="mt-1 text-xs text-ink-3">
        Cómo decide la app qué te toca hoy.
      </p>

      <div className="mt-3 space-y-2">
        {OPCIONES.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              disabled={pending}
              aria-pressed={active}
              className={`block w-full rounded-lg border px-3 py-2.5 text-left transition disabled:opacity-60 ${
                active
                  ? "border-volt/50 bg-volt/[0.08]"
                  : "border-line bg-card hover:border-line-strong"
              }`}
            >
              <span
                className={`font-display text-sm font-bold ${
                  active ? "text-volt" : "text-ink"
                }`}
              >
                {o.title}
                {active && (
                  <span className="ml-2 font-mono text-[9px] font-semibold tracking-widest text-volt/70">
                    ACTIVO
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-ink-2">{o.desc}</span>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-xs text-warn">{error}</p>}
    </div>
  );
}
