"use client";

import { useEffect, useRef, useState } from "react";
import { saveProfile } from "@/lib/actions";
import { AthleteProfile, PROFILE_FIELDS, missingRequired } from "@/lib/profile";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Render mínimo: **negrita** y saltos de línea. Sin librerías de markdown. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold text-ink">
            {p.slice(2, -2)}
          </strong>
        ) : (
          p
        )
      )}
    </span>
  );
}

export default function CoachChat({
  initialProfile,
}: {
  initialProfile: AthleteProfile;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Si el perfil está incompleto, el formulario arranca abierto
  const [showProfile, setShowProfile] = useState(
    missingRequired(initialProfile).length > 0
  );
  const [profile, setProfile] = useState<AthleteProfile>(initialProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    fetch("/api/coach-chat")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d) =>
        setMessages(
          (d.messages ?? []).map((m: Msg & { createdAt: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }))
        )
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    setBusy(true);
    const userMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: text };
    const draftId = `a-${Date.now()}`;
    setMessages((m) => [...m, userMsg, { id: draftId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/coach-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        throw new Error(d?.error ?? "Error hablando con el coach");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) =>
          m.map((msg) => (msg.id === draftId ? { ...msg, content: acc } : msg))
        );
      }
    } catch (e) {
      setMessages((m) => m.filter((msg) => msg.id !== draftId || msg.content));
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }

  async function clearChat() {
    if (!confirm("¿Borrar toda la conversación con el coach?")) return;
    await fetch("/api/coach-chat", { method: "DELETE" });
    setMessages([]);
  }

  async function submitProfile() {
    const r = await saveProfile(profile);
    if (r.ok) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
      setShowProfile(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col md:mx-auto md:max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Coach IA</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="rounded border border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-2 active:bg-raised"
          >
            Mi perfil
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="rounded border border-line-strong px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 active:bg-raised"
            >
              Borrar
            </button>
          )}
        </div>
      </div>

      {showProfile && (
        <div className="mt-3 rounded-lg border border-line bg-surface p-4">
          <p className="mb-3 text-sm text-ink-2">
            El coach usa esto en cada respuesta. Si generaste tu plan con el
            skill Trainy, puede venir pre-llenado — revisalo y completá lo que
            falte.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {PROFILE_FIELDS.filter((f) => !f.long).map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {f.label}
                  {f.required && <span className="text-volt"> *</span>}
                </span>
                <input
                  value={profile[f.key] ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, [f.key]: e.target.value }))
                  }
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
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-ink-3">
                  {f.label}
                  {f.required && <span className="text-volt"> *</span>}
                </span>
                <textarea
                  value={profile[f.key] ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, [f.key]: e.target.value }))
                  }
                  placeholder={f.placeholder}
                  rows={2}
                  maxLength={600}
                  className="w-full rounded border border-line bg-bg p-3 text-[15px] text-ink outline-none placeholder:text-ink-3/60 focus:border-volt"
                />
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-ink-3">
              {missingRequired(profile).length > 0
                ? `Falta: ${missingRequired(profile).join(", ")}`
                : "Perfil completo ✓"}
            </p>
            <button
              onClick={submitProfile}
              className="h-10 shrink-0 rounded bg-volt px-5 font-display text-sm font-bold text-volt-ink active:bg-volt-pressed"
            >
              {profileSaved ? "Guardado ✓" : "Guardar perfil"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex-1 space-y-3">
        {messages.length === 0 && !busy && (
          <div className="rounded-lg border border-line bg-surface p-4 text-sm text-ink-2">
            <p className="font-semibold text-ink">
              Tu coach conoce tu plan, tus registros y tus marcas.
            </p>
            <p className="mt-2">Probá con:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>&quot;¿Con cuánto arranco hoy las dominadas?&quot;</li>
              <li>&quot;Me duele un poco el hombro con el press, ¿qué hago?&quot;</li>
              <li>&quot;¿Cómo viene mi progresión de sentadilla?&quot;</li>
            </ul>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-8 rounded-lg rounded-br-sm bg-volt/10 border border-volt/25 p-3 text-[15px] text-ink"
                : "mr-4 rounded-lg rounded-bl-sm border border-line bg-surface p-3 text-[15px] leading-relaxed text-ink-2"
            }
          >
            {m.content ? (
              <RichText text={m.content} />
            ) : (
              <span className="inline-flex gap-1 text-ink-3">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse [animation-delay:150ms]">●</span>
                <span className="animate-pulse [animation-delay:300ms]">●</span>
              </span>
            )}
          </div>
        ))}
        {error && (
          <p className="rounded border border-err/40 bg-err/10 p-3 text-sm text-err">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-[calc(70px+env(safe-area-inset-bottom))] mt-4 flex gap-2 bg-bg pb-2 pt-1 md:bottom-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Preguntale a tu coach..."
          disabled={busy}
          className="h-12 flex-1 rounded-lg border border-line bg-surface px-4 text-[15px] text-ink outline-none focus:border-volt disabled:opacity-60"
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="h-12 rounded-lg bg-volt px-5 font-display text-sm font-bold text-volt-ink active:bg-volt-pressed disabled:bg-raised disabled:text-ink-3"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
