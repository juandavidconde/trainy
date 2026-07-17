"use client";

import { useEffect, useRef, useState } from "react";

export default function RestTimer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(seconds: number) {
    if (interval.current) clearInterval(interval.current);
    setRemaining(seconds);
    interval.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (interval.current) clearInterval(interval.current);
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
    return () => {
      if (interval.current) clearInterval(interval.current);
    };
  }, []);

  return (
    <div className="fixed bottom-16 right-3 z-30">
      {remaining !== null ? (
        <button
          onClick={() => {
            if (interval.current) clearInterval(interval.current);
            setRemaining(null);
          }}
          className="rounded-full bg-accent px-4 py-2.5 font-mono text-sm font-bold text-white shadow-lg"
        >
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} ✕
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          {[90, 120, 180].map((s) => (
            <button
              key={s}
              onClick={() => start(s)}
              className="rounded-full border border-neutral-700 bg-card px-3 py-1.5 text-xs font-semibold text-neutral-300 shadow-lg"
            >
              ⏱ {s >= 120 ? `${s / 60}m` : `${s}s`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
