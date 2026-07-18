"use client";

// Onboarding = assessment del skill Trainy en versión app: una pregunta por
// pantalla, termina generando el bloque de 12 semanas.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AthleteProfile } from "@/lib/profile";
import { saveName, saveProfile } from "@/lib/actions";

interface Summary {
  nombre: string;
  split: string | null;
  sesiones: { name: string; ejercicios: number }[];
  fechaInicio: string;
}

const OBJETIVOS = ["Hipertrofia", "Fuerza", "Recomposición", "Definición"];
const NIVELES = [
  { label: "Principiante", detail: "< 1 año entrenando" },
  { label: "Intermedio", detail: "1-3 años" },
  { label: "Avanzado", detail: "3+ años" },
];
const DIAS = [3, 4, 5, 6];
const TIEMPOS = ["45 min", "60 min", "75 min", "90 min"];

const chip = (active: boolean) =>
  `rounded-lg border px-4 py-3 text-left text-[15px] transition-colors ${
    active
      ? "border-volt bg-volt/10 text-volt"
      : "border-line bg-surface text-ink-2 active:bg-raised"
  }`;
const inputCls =
  "w-full rounded-lg border border-line bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-3/60 focus:border-volt";

export default function OnboardingWizard({
  initialName,
  initialProfile,
  canGenerate,
}: {
  initialName: string;
  initialProfile: AthleteProfile;
  canGenerate: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [p, setP] = useState<AthleteProfile>(initialProfile);
  const [nivel, setNivel] = useState("");
  const [anios, setAnios] = useState("");
  const [dias, setDias] = useState<number | null>(null);
  const [tiempo, setTiempo] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const set = (k: keyof AthleteProfile, v: string) => setP((x) => ({ ...x, [k]: v }));

  const experiencia = useMemo(
    () => (nivel ? `${nivel}${anios.trim() ? ` (${anios.trim()})` : ""}` : p.experiencia ?? ""),
    [nivel, anios, p.experiencia]
  );

  const steps: { title: string; hint?: string; valid: boolean; body: React.ReactNode }[] = [
    {
      title: name ? `Hola, ${name.split(" ")[0]} 👋` : "Empecemos",
      hint: "Tu coach usa esto para diseñar un bloque de pesas de 12 semanas hecho a tu medida. Toma 2 minutos.",
      valid: name.trim().length > 0,
      body: (
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">¿Cómo te llamás?</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className={inputCls} maxLength={80} />
          </label>
        </div>
      ),
    },
    {
      title: "Sobre vos",
      valid: !!(p.edad?.trim() && p.sexo?.trim() && p.peso?.trim() && p.estatura?.trim()),
      body: (
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["edad", "Edad", "38"],
              ["sexo", "Sexo", "M / F"],
              ["peso", "Peso", "82 kg"],
              ["estatura", "Estatura", "178 cm"],
            ] as const
          ).map(([k, label, ph]) => (
            <label key={k} className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">{label}</span>
              <input value={p[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={ph} className={inputCls} maxLength={40} />
            </label>
          ))}
        </div>
      ),
    },
    {
      title: "Tu experiencia con las pesas",
      valid: !!nivel || !!p.experiencia?.trim(),
      body: (
        <div className="space-y-2">
          {NIVELES.map((n) => (
            <button key={n.label} onClick={() => setNivel(n.label)} className={`block w-full ${chip(nivel === n.label)}`}>
              <span className="font-semibold">{n.label}</span>
              <span className="ml-2 text-sm text-ink-3">{n.detail}</span>
            </button>
          ))}
          <input value={anios} onChange={(e) => setAnios(e.target.value)} placeholder="Detalle opcional: '8 años, sé hacer básicos'" className={inputCls} maxLength={120} />
        </div>
      ),
    },
    {
      title: "¿Cuál es tu objetivo?",
      valid: !!p.objetivo?.trim(),
      body: (
        <div className="grid grid-cols-2 gap-2">
          {OBJETIVOS.map((o) => (
            <button key={o} onClick={() => set("objetivo", o)} className={chip(p.objetivo === o)}>
              {o}
            </button>
          ))}
        </div>
      ),
    },
    {
      title: "Tu disponibilidad",
      hint: "Sé realista: un plan que cumplís al 80% le gana a uno perfecto que cumplís al 40%.",
      valid: dias !== null && !!tiempo,
      body: (
        <div className="space-y-4">
          <div>
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-3">Días de gym por semana</span>
            <div className="grid grid-cols-4 gap-2">
              {DIAS.map((d) => (
                <button key={d} onClick={() => setDias(d)} className={`${chip(dias === d)} text-center font-display font-bold`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-3">Tiempo por sesión</span>
            <div className="grid grid-cols-4 gap-2">
              {TIEMPOS.map((t) => (
                <button key={t} onClick={() => setTiempo(t)} className={`${chip(tiempo === t)} px-1 text-center text-sm`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "¿Practicás otro deporte?",
      hint: "Esto cambia el diseño entero: volumen de pierna, split y recuperación.",
      valid: !!p.deporte?.trim(),
      body: (
        <div className="space-y-2">
          <button onClick={() => set("deporte", "Ninguno")} className={`w-full ${chip(p.deporte === "Ninguno")}`}>
            No, solo gym
          </button>
          <textarea
            value={p.deporte === "Ninguno" ? "" : p.deporte ?? ""}
            onChange={(e) => set("deporte", e.target.value)}
            placeholder="Ej: running 20 km/semana · fútbol los sábados · ciclismo 3x/sem"
            rows={3}
            className={inputCls}
            maxLength={400}
          />
        </div>
      ),
    },
    {
      title: "Lesiones o molestias",
      hint: "El plan evita lo que te hace daño y te cuida en lo que duele.",
      valid: !!p.lesiones?.trim(),
      body: (
        <div className="space-y-2">
          <button onClick={() => set("lesiones", "Ninguna")} className={`w-full ${chip(p.lesiones === "Ninguna")}`}>
            Ninguna
          </button>
          <textarea
            value={p.lesiones === "Ninguna" ? "" : p.lesiones ?? ""}
            onChange={(e) => set("lesiones", e.target.value)}
            placeholder="Ej: molestia en hombro izquierdo con press tras nuca, lumbar sensible al peso muerto..."
            rows={3}
            className={inputCls}
            maxLength={400}
          />
        </div>
      ),
    },
    {
      title: "¿Conocés tus marcas?",
      hint: "Opcional pero valioso: con PRs reales el peso de arranque queda clavado.",
      valid: true,
      body: (
        <textarea
          value={p.prs ?? ""}
          onChange={(e) => set("prs", e.target.value)}
          placeholder={"Ej:\nBanca 8×135 lb\nSentadilla 10×185 lb\nDominadas 12×BW"}
          rows={4}
          className={inputCls}
          maxLength={400}
        />
      ),
    },
  ];

  const last = steps.length - 1;
  const current = steps[step];

  async function persistProfile(): Promise<boolean> {
    if (name.trim() && name !== initialName) await saveName(name);
    const r = await saveProfile({ ...p, experiencia });
    return r.ok;
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      await persistProfile();
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { ...p, experiencia }, dias, tiempoSesion: tiempo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo generar el plan");
      setSummary(data as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setGenerating(false);
    }
  }

  async function skip() {
    await persistProfile();
    router.push("/today?skip=1");
    router.refresh();
  }

  // ── Pantallas terminales ────────────────────────────────────
  if (summary) {
    return (
      <div className="flex min-h-[80dvh] flex-col justify-center text-center">
        <p className="font-display text-4xl">🏆</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Tu bloque está listo</h1>
        <p className="mt-2 text-ink-2">
          <span className="font-semibold text-ink">{summary.nombre}</span>
          {summary.split && <> · {summary.split}</>}
        </p>
        <div className="mx-auto mt-5 w-full max-w-xs space-y-1.5 text-left">
          {summary.sesiones.map((s) => (
            <div key={s.name} className="flex justify-between rounded border border-line bg-surface px-3 py-2 text-sm">
              <span className="font-display font-bold">{s.name}</span>
              <span className="text-ink-3">{s.ejercicios} ejercicios</span>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-xs text-ink-3">
          12 semanas · descargas S6 y S12 · arranca {summary.fechaInicio}
        </p>
        <button
          onClick={() => {
            router.push("/today");
            router.refresh();
          }}
          className="mx-auto mt-6 h-12 w-full max-w-xs rounded-lg bg-volt font-display font-bold text-volt-ink shadow-glow active:bg-volt-pressed"
        >
          Ir a entrenar
        </button>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-volt" />
        <h1 className="mt-5 font-display text-xl font-bold">Diseñando tu bloque…</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-2">
          Split, ejercicios, pesos de arranque y progresión de 12 semanas según tu perfil. Tarda ~1 minuto.
        </p>
      </div>
    );
  }

  // ── Wizard ──────────────────────────────────────────────────
  return (
    <div className="flex min-h-[85dvh] flex-col">
      <div className="mb-6 flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-volt" : "bg-line"}`} />
        ))}
      </div>

      <h1 className="font-display text-2xl font-bold">{current.title}</h1>
      {current.hint && <p className="mt-1.5 text-sm text-ink-2">{current.hint}</p>}
      <div className="mt-5">{current.body}</div>

      {error && <p className="mt-4 rounded border border-err/40 bg-err/10 p-3 text-sm text-err">{error}</p>}

      <div className="mt-auto pt-8">
        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="h-12 rounded-lg border border-line-strong px-5 text-ink-2 active:bg-raised"
            >
              Atrás
            </button>
          )}
          {step < last ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!current.valid}
              className="h-12 flex-1 rounded-lg bg-volt font-display font-bold text-volt-ink active:bg-volt-pressed disabled:bg-raised disabled:text-ink-3"
            >
              Siguiente
            </button>
          ) : canGenerate ? (
            <button
              onClick={generate}
              className="h-12 flex-1 rounded-lg bg-volt font-display font-bold text-volt-ink shadow-glow active:bg-volt-pressed"
            >
              Generar mi plan 🏋️
            </button>
          ) : (
            <button
              onClick={skip}
              className="h-12 flex-1 rounded-lg bg-volt font-display font-bold text-volt-ink active:bg-volt-pressed"
            >
              Guardar perfil
            </button>
          )}
        </div>
        <button onClick={skip} className="mt-3 w-full text-center text-sm text-ink-3 underline-offset-4 hover:underline">
          Ya tengo coach — saltar por ahora
        </button>
      </div>
    </div>
  );
}
