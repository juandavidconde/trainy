"use client";

import { useEffect, useState } from "react";

// La pregunta que más se repite cuando alguien recibe el link es "¿y dónde la
// bajo?". Trainy es una PWA: no está en la App Store ni en Play, y quien va a
// buscarla ahí no encuentra nada y no vuelve. Por eso los pasos de instalación
// son una sección propia y no una nota al pie — y arrancan abiertos en la
// plataforma del celular que está leyendo.

type Platform = "ios" | "android";

const STEPS: Record<Platform, string[]> = {
  ios: [
    "Abrí este link en Safari (si estás en Chrome, no aparece la opción).",
    "Tocá el botón Compartir — el cuadrito con la flecha hacia arriba.",
    "Bajá y elegí «Añadir a pantalla de inicio».",
    "Listo: Trainy queda como una app más, sin barra del navegador.",
  ],
  android: [
    "Abrí este link en Chrome.",
    "Tocá los tres puntos de arriba a la derecha.",
    "Elegí «Instalar app» o «Añadir a pantalla de inicio».",
    "Listo: Trainy queda como una app más, sin barra del navegador.",
  ],
};

const LABEL: Record<Platform, string> = { ios: "iPhone", android: "Android" };

export default function InstallSteps() {
  // Arranca en iOS porque es donde la instalación es menos obvia (Android
  // ofrece el banner solo). Si el user-agent dice otra cosa, se corrige al
  // montar — nunca en el render del servidor, que no sabe qué celular es.
  const [platform, setPlatform] = useState<Platform>("ios");

  useEffect(() => {
    if (/android/i.test(navigator.userAgent)) setPlatform("android");
  }, []);

  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <div className="flex gap-2">
        {(["ios", "android"] as Platform[]).map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={
              platform === p
                ? "rounded-lg bg-volt px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-volt-ink"
                : "rounded-lg border border-line-strong px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ink-3 active:bg-raised"
            }
          >
            {LABEL[p]}
          </button>
        ))}
      </div>
      <ol className="mt-4 space-y-3">
        {STEPS[platform].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-ink-2">
            <span className="font-mono text-xs text-volt">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
