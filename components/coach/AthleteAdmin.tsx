"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import {
  archiveAthletePlan,
  deleteAthlete,
  resetAthletePassword,
  setAthleteStartDate,
  setRole,
} from "@/lib/coach-actions";
import { runAction } from "@/components/settings/SettingsCard";
import { weekFromIso } from "@/lib/week";

const card = "rounded-lg border border-line bg-surface p-4";
const heading =
  "font-display text-sm font-bold uppercase tracking-widest text-ink";
const hint = "mt-1 text-xs leading-relaxed text-ink-3";
const input =
  "h-11 w-full rounded border border-line bg-bg px-3 text-[15px] text-ink outline-none focus:border-volt";
const primary =
  "h-11 shrink-0 rounded bg-volt px-4 font-display text-sm font-bold text-volt-ink active:bg-volt-pressed disabled:bg-raised disabled:text-ink-3";
const ghost =
  "h-11 shrink-0 rounded border border-line-strong px-4 font-display text-sm font-bold text-ink-2 active:bg-raised disabled:text-ink-3";

export default function AthleteAdmin({
  userId,
  email,
  role,
  isSelf,
  hasPlan,
  planName,
  startDateIso,
  weeks,
}: {
  userId: string;
  email: string;
  role: Role;
  isSelf: boolean;
  hasPlan: boolean;
  planName: string | null;
  startDateIso: string | null;
  weeks: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(startDateIso ?? "");
  useEffect(() => setDate(startDateIso ?? ""), [startDateIso]);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typedEmail, setTypedEmail] = useState("");

  // Se muestra una sola vez: no se guarda en claro en ningún lado
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string }>) {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const r = await runAction(fn);
      if (!r.ok) {
        setError(r.error ?? "No se pudo completar");
        return false;
      }
      setInfo(r.info ?? "Listo.");
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  const preview = date ? weekFromIso(date, weeks) : null;

  return (
    <div className="space-y-3">
      <section className={card}>
        <h2 className={heading}>Rol</h2>
        <p className={hint}>
          Un coach ve a todos los atletas, importa bloques y administra la
          instancia. Un atleta solo ve lo suyo.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-2">
            {role === "COACH" ? "coach" : "atleta"}
          </span>
          <button
            disabled={busy}
            onClick={() =>
              run(() => setRole(userId, role === "COACH" ? "ATHLETE" : "COACH"))
            }
            className={ghost}
          >
            {role === "COACH" ? "Bajar a atleta" : "Promover a coach"}
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className={heading}>Bloque</h2>
        {hasPlan ? (
          <>
            <p className={hint}>
              <span className="font-semibold text-ink-2">{planName}</span> ·{" "}
              {weeks} semanas. Si le aparece una semana que no es, corregí la
              fecha de arranque.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
              <button
                disabled={busy || !date || date === startDateIso}
                onClick={() => run(() => setAthleteStartDate(userId, date))}
                className={primary}
              >
                Guardar
              </button>
            </div>
            {preview && (
              <p className="mt-2 font-mono text-[11px] text-ink-3">
                Con esa fecha va en la semana S{preview}.
              </p>
            )}
            <button
              disabled={busy}
              onClick={() => run(() => archiveAthletePlan(userId))}
              className={`${ghost} mt-3`}
            >
              Archivar bloque
            </button>
          </>
        ) : (
          <p className={hint}>
            Sin bloque activo. Publicale uno desde el skill Trainy o pegá el{" "}
            <code>plan.json</code> abajo en la lista de atletas.
          </p>
        )}
      </section>

      {!isSelf && role !== "COACH" && (
        <section className={card}>
          <h2 className={heading}>Acceso</h2>
          <p className={hint}>
            Si perdió la clave, generale una temporal y pasásela por WhatsApp.
            Se muestra una sola vez — después queda guardada cifrada y ni vos la
            podés volver a ver. Pedile que la cambie en Ajustes al entrar.
          </p>
          {tempPassword ? (
            <div className="mt-3 rounded border border-volt/30 bg-volt/[0.07] p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-volt">
                Clave temporal de {email}
              </p>
              <p className="mt-1 select-all font-mono text-xl font-bold tracking-wider text-ink">
                {tempPassword}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(tempPassword);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      // sin permiso de portapapeles: queda seleccionable a mano
                    }
                  }}
                  className={ghost}
                >
                  {copied ? "Copiada ✓" : "Copiar"}
                </button>
                <button
                  onClick={() => setTempPassword(null)}
                  className={ghost}
                >
                  Ya la pasé
                </button>
              </div>
            </div>
          ) : (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setInfo(null);
                try {
                  const r = await runAction(() =>
                    resetAthletePassword(userId)
                  );
                  if (!r.ok) {
                    setError(r.error ?? "No se pudo generar");
                    return;
                  }
                  setTempPassword(
                    "password" in r ? (r.password ?? null) : null
                  );
                  setInfo(r.info ?? null);
                } finally {
                  setBusy(false);
                }
              }}
              className={`${ghost} mt-3`}
            >
              {busy ? "…" : "Generar clave temporal"}
            </button>
          )}
        </section>
      )}

      {!isSelf && role !== "COACH" && (
        <section className="rounded-lg border border-err/30 bg-err/[0.06] p-4">
          <h2 className={heading}>Dar de baja</h2>
          <p className={hint}>
            Borra a esta persona con sus bloques, registros y chat del Coach IA.
            No se puede deshacer.
          </p>
          {!confirmDelete ? (
            <button
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="mt-3 h-11 rounded border border-err/50 px-4 font-display text-sm font-bold text-err active:bg-err/10"
            >
              Dar de baja
            </button>
          ) : (
            <div className="mt-3">
              <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-ink-3">
                Escribí <span className="text-err">{email}</span> para confirmar
              </p>
              <div className="flex gap-2">
                <input
                  value={typedEmail}
                  onChange={(e) => setTypedEmail(e.target.value)}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="h-11 min-w-0 flex-1 rounded border border-line bg-bg px-3 text-[15px] text-ink outline-none focus:border-err"
                />
                <button
                  disabled={
                    busy ||
                    typedEmail.trim().toLowerCase() !== email.toLowerCase()
                  }
                  onClick={async () => {
                    const ok = await run(() =>
                      deleteAthlete(userId, typedEmail)
                    );
                    if (ok) router.push("/coach");
                  }}
                  className="h-11 shrink-0 rounded bg-err px-4 font-display text-sm font-bold text-bg disabled:bg-raised disabled:text-ink-3"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    setTypedEmail("");
                  }}
                  className="h-11 shrink-0 rounded border border-line-strong px-3 text-sm text-ink-2"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {error && <p className="text-sm text-err">{error}</p>}
      {info && <p className="text-sm text-ok">{info}</p>}
    </div>
  );
}
