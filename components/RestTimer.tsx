"use client";

import { useEffect, useRef, useState } from "react";

export default function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
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

  useEffect(() => {
    // Al marcar una serie como hecha, el timer arranca solo
    function onSetDone(e: Event) {
      if (running.current) return;
      const progression = (e as CustomEvent).detail?.progression as string | null;
      start(progression === "COMPOUND" ? 150 : 90);
    }
    window.addEventListener("trainy:set-done", onSetDone);
    return () => {
      window.removeEventListener("trainy:set-done", onSetDone);
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  return (
    <div className="fixed bottom-20 right-3 z-30 md:bottom-6 md:right-6">
      {remaining !== null ? (
        <button
          onClick={() => {
            if (interval.current) clearInterval(interval.current);
            running.current = false;
            setRemaining(null);
          }}
          className="rounded-full bg-accent px-5 py-3 font-mono text-base font-bold text-white shadow-xl"
        >
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}{" "}
          <span className="text-xs opacity-70">✕</span>
        </button>
      ) : (
        <div className="flex gap-1.5">
          {[90, 150].map((s) => (
            <button
              key={s}
              onClick={() => start(s)}
              className="rounded-full border border-neutral-700 bg-card px-3.5 py-2 text-xs font-semibold text-neutral-300 shadow-xl"
            >
              ⏱ {s === 90 ? "90s" : "2:30"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
