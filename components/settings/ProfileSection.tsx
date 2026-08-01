"use client";

import { useState } from "react";
import { saveName, saveProfile } from "@/lib/actions";
import { AthleteProfile, missingRequired } from "@/lib/profile";
import ProfileFields from "@/components/ProfileFields";
import SettingsCard, {
  Feedback,
  runAction,
  settingsButton,
  settingsInput,
  settingsLabel,
} from "@/components/settings/SettingsCard";

export default function ProfileSection({
  initialName,
  initialProfile,
}: {
  initialName: string;
  initialProfile: AthleteProfile;
}) {
  const [name, setName] = useState(initialName);
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setInfo(null);
    setError(null);
    try {
      const clean = name.trim();
      if (clean && clean !== initialName) {
        const r = await runAction(() => saveName(clean));
        if (!r.ok) {
          setError(r.error ?? "No se pudo guardar el nombre");
          return;
        }
      }
      const r = await runAction(() => saveProfile(profile));
      if (!r.ok) {
        setError(r.error ?? "No se pudo guardar el perfil");
        return;
      }
      setInfo("Perfil guardado.");
    } finally {
      setBusy(false);
    }
  }

  const missing = missingRequired(profile);

  return (
    <SettingsCard
      title="Perfil"
      hint="Tu coach y el Coach IA usan esto en cada respuesta. Si tu plan lo armó el skill Trainy, puede venir pre-llenado."
    >
      <label className="mb-3 block">
        <span className={settingsLabel}>Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Cómo querés que te llamen"
          className={settingsInput}
        />
      </label>

      <ProfileFields
        profile={profile}
        onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-3">
          {missing.length > 0 ? `Falta: ${missing.join(", ")}` : "Perfil completo ✓"}
        </p>
        <button onClick={save} disabled={busy} className={settingsButton}>
          {busy ? "…" : "Guardar"}
        </button>
      </div>
      <Feedback error={error} info={info} />
    </SettingsCard>
  );
}
