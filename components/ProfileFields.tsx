"use client";

import { AthleteProfile, PROFILE_FIELDS } from "@/lib/profile";

/** Los campos del perfil del atleta. Compartidos por el Coach IA y Ajustes
 *  para que no se desincronicen. */
export default function ProfileFields({
  profile,
  onChange,
}: {
  profile: AthleteProfile;
  onChange: (patch: Partial<AthleteProfile>) => void;
}) {
  const label = (key: string, text: string, required: boolean) => (
    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
      {text}
      {required && <span className="text-volt"> *</span>}
    </span>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        {PROFILE_FIELDS.filter((f) => !f.long).map((f) => (
          <label key={f.key} className="block">
            {label(f.key, f.label, f.required)}
            <input
              value={profile[f.key] ?? ""}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              maxLength={600}
              className="h-11 w-full rounded border border-line bg-bg px-3 text-[15px] text-ink outline-none placeholder:text-ink-3/60 focus:border-volt"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 space-y-2">
        {PROFILE_FIELDS.filter((f) => f.long).map((f) => (
          <label key={f.key} className="block">
            {label(f.key, f.label, f.required)}
            <textarea
              value={profile[f.key] ?? ""}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
              rows={2}
              maxLength={600}
              className="w-full rounded border border-line bg-bg p-3 text-[15px] text-ink outline-none placeholder:text-ink-3/60 focus:border-volt"
            />
          </label>
        ))}
      </div>
    </>
  );
}
