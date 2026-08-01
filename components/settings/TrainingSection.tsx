"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveStartDate } from "@/lib/account-actions";
import { readRest, REST_DEFAULT, RestPrefs, writeRest } from "@/lib/rest";
import { weekFromIso } from "@/lib/week";
import SettingsCard, {
  Feedback,
  runAction,
  settingsButton,
  settingsInput,
  settingsLabel,
} from "@/components/settings/SettingsCard";

export default function TrainingSection({
  planName,
  startDateIso,
  weeks,
}: {
  planName: string | null;
  startDateIso: string | null;
  weeks: number;
}) {
  const router = useRouter();
  const [date, setDate] = useState(startDateIso ?? "");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reiniciar el bloque cambia la fecha desde el servidor: sin esto el input
  // se quedaba mostrando la vieja hasta recargar a mano.
  useEffect(() => setDate(startDateIso ?? ""), [startDateIso]);

  const [rest, setRest] = useState<RestPrefs>(REST_DEFAULT);
  const [restSaved, setRestSaved] = useState(false);
  useEffect(() => setRest(readRest()), []);

  function updateRest(patch: Partial<RestPrefs>) {
    const next = { ...rest, ...patch };
    setRest(next);
    setRestSaved(false);
  }

  function commitRest() {
    setRest(writeRest(rest));
    setRestSaved(true);
    setTimeout(() => setRestSaved(false), 2000);
  }

  async function submitDate() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await runAction(() => saveStartDate(date));
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setInfo(r.info ?? "Guardado.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const preview = date ? weekFromIso(date, weeks) : null;

  return (
    <>
      <SettingsCard
        title="Bloque"
        hint="Si la app te muestra una semana que no es en la que vas, corregí acá la fecha en que arrancaste el bloque."
      >
        {planName ? (
          <>
            <p className="mb-3 text-sm text-ink-2">
              <span className="font-semibold text-ink">{planName}</span> ·{" "}
              {weeks} semanas
            </p>
            <label className="block">
              <span className={settingsLabel}>Empecé el bloque el</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className={settingsInput}
              />
            </label>
            {preview && (
              <p className="mt-2 font-mono text-[11px] text-ink-3">
                Con esa fecha estás en la semana S{preview}.
              </p>
            )}
            <button
              onClick={submitDate}
              disabled={busy || !date || date === startDateIso}
              className={`${settingsButton} mt-3`}
            >
              {busy ? "…" : "Guardar fecha"}
            </button>
            <Feedback error={error} info={info} />
          </>
        ) : (
          <p className="text-sm text-ink-3">No tenés un bloque activo.</p>
        )}
      </SettingsCard>

      <SettingsCard
        title="Descanso"
        hint="Cuánto dura el cronómetro que arranca solo al marcar una serie. Se guarda en este dispositivo."
      >
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={settingsLabel}>Básicos (compound), seg</span>
            <input
              type="number"
              inputMode="numeric"
              min={15}
              max={600}
              value={rest.compound}
              onChange={(e) => updateRest({ compound: Number(e.target.value) })}
              onBlur={commitRest}
              className={settingsInput}
            />
          </label>
          <label className="block">
            <span className={settingsLabel}>Resto, seg</span>
            <input
              type="number"
              inputMode="numeric"
              min={15}
              max={600}
              value={rest.other}
              onChange={(e) => updateRest({ other: Number(e.target.value) })}
              onBlur={commitRest}
              className={settingsInput}
            />
          </label>
        </div>
        <button onClick={commitRest} className={`${settingsButton} mt-3`}>
          {restSaved ? "Guardado ✓" : "Guardar descansos"}
        </button>
      </SettingsCard>
    </>
  );
}
