"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds, readRest, REST_DEFAULT, RestPrefs } from "@/lib/rest";

export default function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  // Las duraciones se configuran en Ajustes → Entrenamiento
  const [prefs, setPrefs] = useState<RestPrefs>(REST_DEFAULT);
  const prefsRef = useRef<RestPrefs>(REST_DEFAULT);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = useRef(false);

  function start(seconds: number) {
    if (interval.current) clearInterval(interval.current);
    running.current = true;
    setRemaining(seconds);
    interval.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (interval.current) clearInterval(interval.current);
          running.current = false;
          if (prev !== null && typeof navigator !== "undefined") {
            navigator.vibrate?.([200, 100, 200]);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // localStorage no existe en el render del servidor: se lee tras montar
  useEffect(() => {
    const apply = (p: RestPrefs) => {
      prefsRef.current = p;
      setPrefs(p);
    };
    apply(readRest());
    const onChange = (e: Event) =>
      apply((e as CustomEvent).detail as RestPrefs);
    window.addEventListener("trainy:rest-changed", onChange);
    return () => window.removeEventListener("trainy:rest-changed", onChange);
  }, []);

  useEffect(() => {
    // Al marcar una serie como hecha, el timer arranca solo
    function onSetDone(e: Event) {
      if (running.current) return;
      const progression = (e as CustomEvent).detail?.progression as string | null;
      const p = prefsRef.current;
      start(progression === "COMPOUND" ? p.compound : p.other);
    }
    window.addEventListener("trainy:set-done", onSetDone);
    return () => {
      window.removeEventListener("trainy:set-done", onSetDone);
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  // Sin duplicados si ambas duraciones coinciden
  const quick = [...new Set([prefs.other, prefs.compound])];

  return (
    <div className="fixed bottom-20 right-3 z-30 md:bottom-6 md:right-6">
      {remaining !== null ? (
        <button
          onClick={() => {
            if (interval.current) clearInterval(interval.current);
            running.current = false;
            setRemaining(null);
          }}
          className="rounded-xl border border-line-strong bg-raised px-5 py-3 font-display text-2xl font-bold tabular text-volt shadow-floating"
        >
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}{" "}
          <span className="align-middle font-mono text-xs font-normal text-ink-3">
            ✕
          </span>
        </button>
      ) : (
        <div className="flex gap-1.5">
          {quick.map((s) => (
            <button
              key={s}
              onClick={() => start(s)}
              className="rounded-xl border border-line-strong bg-raised px-3.5 py-2 font-mono text-xs font-semibold text-ink-2 shadow-floating"
            >
              ⏱ {formatSeconds(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
