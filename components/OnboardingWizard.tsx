"use client";

// Onboarding = assessment del skill Trainy en versión app: una pregunta por
// pantalla, termina generando el bloque de 12 semanas.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AthleteProfile } from "@/lib/profile";
import { acceptConsent, saveName, saveProfile } from "@/lib/actions";
import { CONSENT_SUMMARY, CONSENT_VERSION } from "@/lib/consent";
import { LiftMarks, parseMarks, serializeMarks } from "@/lib/key-lifts";
import { PRIORIDADES, countFocused, findPriority } from "@/lib/priority";
import KeyLiftsStep from "@/components/KeyLiftsStep";

// El perfil solo se persistía al generar o al saltar: si la persona cerraba la
// app o refrescaba en la pantalla 6 de 8, las respuestas se evaporaban y volvía
// al paso 0 en blanco. Se guarda el borrador en el dispositivo a cada cambio.
// v2: el borrador ahora incluye las marcas por ejercicio y la prioridad
// muscular. Un draft v1 a medio llenar no sabe de esos campos, así que se
// descarta en vez de restaurarse incompleto.
const DRAFT_KEY = "trainy:onboarding-draft:v2";

interface Draft {
  step: number;
  name: string;
  p: AthleteProfile;
  nivel: string;
  anios: string;
  dias: number | null;
  tiempo: string;
  marks: LiftMarks;
}

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    return d && typeof d === "object" && typeof d.step === "number" ? d : null;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
    window.localStorage.removeItem("trainy:onboarding-draft:v1");
  } catch {
    /* modo privado o storage lleno: el borrador es un extra, no rompe el flujo */
  }
}

interface Summary {
  nombre: string;
  split: string | null;
  sesiones: { name: string; ejercicios: number; foco?: string | null }[];
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
  alreadyConsented,
}: {
  initialName: string;
  initialProfile: AthleteProfile;
  canGenerate: boolean;
  /** Ya aceptó la versión vigente de la política — no se le vuelve a pedir. */
  alreadyConsented: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [p, setP] = useState<AthleteProfile>(initialProfile);
  const [nivel, setNivel] = useState("");
  const [anios, setAnios] = useState("");
  const [dias, setDias] = useState<number | null>(null);
  const [tiempo, setTiempo] = useState("");
  const [marks, setMarks] = useState<LiftMarks>(() => parseMarks(initialProfile.prs));
  // El consentimiento NO va al borrador de localStorage: una autorización de
  // tratamiento de datos se da en el momento, no se restaura de una caché del
  // navegador donde cualquiera pudo haberla dejado marcada.
  const [consent, setConsent] = useState(alreadyConsented);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [restored, setRestored] = useState(false);

  const set = (k: keyof AthleteProfile, v: string) => setP((x) => ({ ...x, [k]: v }));
  const setMark = (key: string, patch: Partial<LiftMarks[string]>) =>
    setMarks((m) => ({
      ...m,
      [key]: { ...(m[key] ?? { reps: "", lb: "" }), ...patch },
    }));

  // Restaurar el borrador una sola vez, al montar.
  useEffect(() => {
    const d = readDraft();
    if (!d) return;
    setName((n) => d.name || n);
    setP((prev) => ({ ...prev, ...d.p }));
    setNivel(d.nivel ?? "");
    setAnios(d.anios ?? "");
    setDias(d.dias ?? null);
    setTiempo(d.tiempo ?? "");
    if (d.marks) setMarks(d.marks);
    setStep(d.step ?? 0);
    if (d.step > 0) setRestored(true);
  }, []);

  // Guardar el borrador a cada cambio.
  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ step, name, p, nivel, anios, dias, tiempo, marks } satisfies Draft)
      );
    } catch {
      /* sin storage: seguimos igual, solo se pierde la red de seguridad */
    }
  }, [step, name, p, nivel, anios, dias, tiempo, marks]);

  const experiencia = useMemo(
    () => (nivel ? `${nivel}${anios.trim() ? ` (${anios.trim()})` : ""}` : p.experiencia ?? ""),
    [nivel, anios, p.experiencia]
  );

  // Las marcas viajan como texto en `prs` — el mismo campo que ya leía el
  // generador. La estructura vive en el wizard, no en el contrato.
  //
  // Si el paso queda en blanco no se pisa lo que ya había: los perfiles
  // anteriores guardaron sus PRs como texto libre ("Banca 8×135 lb"), que
  // `parseMarks` no puede mapear a los ejercicios del catálogo. Rehacer el
  // onboarding sin llenar nada los borraría.
  const profile = useMemo<AthleteProfile>(() => {
    const marcas = serializeMarks(marks);
    return { ...p, experiencia, prs: marcas || p.prs || "" };
  }, [p, experiencia, marks]);

  const steps: { title: string; hint?: string; valid: boolean; body: React.ReactNode }[] = [
    // Va PRIMERO y es bloqueante: los pasos siguientes ya piden datos de salud,
    // y la autorización tiene que existir antes de recogerlos, no después.
    ...(alreadyConsented
      ? []
      : [
          {
            title: "Antes de empezar",
            hint: "Trainy necesita datos tuyos para armarte el plan. Esto es lo que hacemos con ellos.",
            valid: consent,
            body: (
              <div className="space-y-3">
                <ul className="space-y-2">
                  {CONSENT_SUMMARY.map((line) => (
                    <li key={line} className="flex gap-2 text-[14px] leading-snug text-ink-2">
                      <span className="text-volt">·</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/legal"
                  target="_blank"
                  className="block text-sm text-volt underline-offset-4 hover:underline"
                >
                  Leer la política completa ↗
                </Link>

                <button
                  type="button"
                  onClick={() => setConsent((c) => !c)}
                  aria-pressed={consent}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    consent
                      ? "border-volt bg-volt/10"
                      : "border-line bg-surface active:bg-raised"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                      consent
                        ? "border-volt bg-volt text-volt-ink"
                        : "border-line-strong text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="text-[14px] leading-snug text-ink">
                    Autorizo el tratamiento de mis datos personales, incluidos
                    los datos de salud, en los términos de la política.
                  </span>
                </button>

                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  Versión {CONSENT_VERSION} · Ley 1581 de 2012
                </p>
              </div>
            ),
          },
        ]),
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
      title: "¿Qué querés hacer crecer?",
      hint: "Esto decide cuántas sesiones de cada tipo lleva tu semana. Si querés pierna, la mayoría de los días van a ser de pierna.",
      valid: !!p.prioridad?.trim(),
      body: (
        <div className="space-y-2">
          {PRIORIDADES.map((pr) => (
            <button
              key={pr.key}
              onClick={() => set("prioridad", pr.label)}
              className={`block w-full ${chip(p.prioridad === pr.label)}`}
            >
              <span className="font-semibold">{pr.label}</span>
              <span className="ml-2 text-sm text-ink-3">{pr.detail}</span>
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
      title: "¿Con cuánto peso trabajás?",
      hint: "Poné las repeticiones que hacés y con cuánto peso, aunque sea aproximado. Con esto el peso de arranque de tus 12 semanas queda clavado; sin esto se estima. Si no conocés un ejercicio, dejalo en blanco.",
      valid: true,
      body: (
        <div className="space-y-3">
          {/* Perfiles viejos guardaban las marcas como texto libre; que no
              parezca que se perdieron por estrenar el paso nuevo. */}
          {Object.keys(marks).length === 0 && p.prs?.trim() && (
            <p className="rounded border border-line bg-card px-3 py-2 text-xs text-ink-3">
              Ya teníamos esto anotado:{" "}
              <span className="font-mono text-ink-2">{p.prs}</span>
            </p>
          )}
          <KeyLiftsStep marks={marks} onChange={setMark} />
        </div>
      ),
    },
  ];

  const last = steps.length - 1;
  const current = steps[step];

  async function persistProfile(): Promise<boolean> {
    // El consentimiento se sella ANTES de escribir nada: si falla, no se
    // guardan datos de salud sin autorización registrada. Cubre también el
    // botón de saltar, que igual persiste el perfil.
    if (!alreadyConsented) {
      if (!consent) {
        setError("Necesitamos tu autorización para tratar tus datos antes de seguir.");
        return false;
      }
      const c = await acceptConsent();
      if (!c.ok) {
        setError(c.error ?? "No se pudo registrar la autorización");
        return false;
      }
    }
    if (name.trim() && name !== initialName) await saveName(name);
    const r = await saveProfile(profile);
    return r.ok;
  }

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      if (!(await persistProfile())) return;
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, dias, tiempoSesion: tiempo }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "No se pudo generar el plan");
      clearDraft();
      setSummary(data as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setGenerating(false);
    }
  }

  async function skip() {
    // Saltar el onboarding igual guarda el perfil, así que también exige la
    // autorización: si no, la salida de emergencia era el hueco por donde
    // entraban datos de salud sin consentimiento.
    if (!(await persistProfile())) return;
    clearDraft();
    router.push("/today?skip=1");
    router.refresh();
  }

  // ── Pantallas terminales ────────────────────────────────────
  if (summary) {
    // Que la prioridad se vea CUMPLIDA, no solo prometida: acá se cuenta
    // cuántas de las sesiones generadas atienden lo que la persona pidió.
    const prioridad = findPriority(p.prioridad);
    const enfocadas = countFocused(prioridad, summary.sesiones);
    return (
      <div className="flex min-h-[80dvh] flex-col justify-center text-center">
        <p className="font-display text-4xl">🏆</p>
        <h1 className="mt-3 font-display text-2xl font-bold">Tu bloque está listo</h1>
        <p className="mt-2 text-ink-2">
          <span className="font-semibold text-ink">{summary.nombre}</span>
          {summary.split && <> · {summary.split}</>}
        </p>
        {prioridad && (
          <p className="mx-auto mt-4 w-full max-w-xs rounded-lg border border-volt/30 bg-volt/[0.07] px-3 py-2 text-sm text-ink-2">
            Prioridad <span className="font-semibold text-volt">{prioridad.label}</span>
            {enfocadas !== null && (
              <>
                {" "}
                — {enfocadas} de {summary.sesiones.length} sesiones
              </>
            )}
          </p>
        )}
        <div className="mx-auto mt-3 w-full max-w-xs space-y-1.5 text-left">
          {summary.sesiones.map((s) => (
            <div key={s.name} className="rounded border border-line bg-surface px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="font-display font-bold">{s.name}</span>
                <span className="text-ink-3">{s.ejercicios} ejercicios</span>
              </div>
              {s.foco && <p className="mt-0.5 text-xs text-ink-3">{s.foco}</p>}
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

      {restored && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-volt/30 bg-volt/[0.07] px-3 py-2 text-xs">
          <span className="text-ink-2">Retomamos donde ibas.</span>
          <button
            onClick={() => {
              clearDraft();
              setRestored(false);
              setStep(0);
              setP(initialProfile);
              setName(initialName);
              setNivel("");
              setAnios("");
              setDias(null);
              setTiempo("");
              setMarks(parseMarks(initialProfile.prs));
            }}
            className="shrink-0 text-volt underline-offset-4 hover:underline"
          >
            Empezar de nuevo
          </button>
        </div>
      )}

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
        {/* En el paso de la autorización no hay salida: saltarlo guardaría el
            perfil igual, y eso es justo lo que no puede pasar. */}
        {!(!alreadyConsented && step === 0) && (
          <button onClick={skip} className="mt-3 w-full text-center text-sm text-ink-3 underline-offset-4 hover:underline">
            Ya tengo coach — saltar por ahora
          </button>
        )}
      </div>
    </div>
  );
}
