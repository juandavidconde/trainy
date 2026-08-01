"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  changeEmail,
  changePassword,
  requestEmailChangeCode,
} from "@/lib/account-actions";
import SettingsCard, {
  Feedback,
  runAction,
  settingsButton,
  settingsGhostButton,
  settingsInput,
  settingsLabel,
} from "@/components/settings/SettingsCard";

export default function AccountSection({
  currentEmail,
  hasPassword,
  otpEnabled,
}: {
  currentEmail: string;
  hasPassword: boolean;
  otpEnabled: boolean;
}) {
  const router = useRouter();

  // ── correo ──
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // ── contraseña ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwInfo, setPwInfo] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  async function sendCode() {
    setEmailBusy(true);
    setEmailError(null);
    setEmailInfo(null);
    try {
      const r = await runAction(() => requestEmailChangeCode(newEmail));
      if (!r.ok) {
        setEmailError(r.error);
        return;
      }
      setCodeSent(true);
      setEmailInfo(r.devCode ? `Código (solo dev): ${r.devCode}` : (r.info ?? null));
    } finally {
      setEmailBusy(false);
    }
  }

  async function submitEmail() {
    setEmailBusy(true);
    setEmailError(null);
    setEmailInfo(null);
    try {
      const r = await runAction(() => changeEmail(newEmail, code, emailPassword));
      if (!r.ok) {
        setEmailError(r.error);
        return;
      }
      setEmailInfo(r.info ?? "Correo actualizado.");
      setNewEmail("");
      setCode("");
      setCodeSent(false);
      setEmailPassword("");
      router.refresh();
    } finally {
      setEmailBusy(false);
    }
  }

  async function submitPassword() {
    setPwBusy(true);
    setPwError(null);
    setPwInfo(null);
    try {
      if (nextPassword !== repeatPassword) {
        setPwError("Las dos contraseñas nuevas no coinciden");
        return;
      }
      const r = await runAction(() => changePassword(currentPassword, nextPassword));
      if (!r.ok) {
        setPwError(r.error);
        return;
      }
      setPwInfo(r.info ?? "Contraseña actualizada.");
      setCurrentPassword("");
      setNextPassword("");
      setRepeatPassword("");
      router.refresh();
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <>
      <SettingsCard
        title="Correo"
        hint={
          <>
            Tu correo es con lo que entrás y también con lo que tu coach te
            publica los bloques. Si lo cambiás, avisale para que actualice el
            suyo.
          </>
        }
      >
        <p className="mb-3 font-mono text-sm text-ink-2">{currentEmail}</p>

        <label className="block">
          <span className={settingsLabel}>Correo nuevo</span>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => {
              setNewEmail(e.target.value);
              setCodeSent(false);
              setCode("");
            }}
            placeholder="nuevo@correo.com"
            autoComplete="email"
            className={settingsInput}
          />
        </label>

        {otpEnabled ? (
          codeSent && (
            <label className="mt-2 block">
              <span className={settingsLabel}>
                Código que llegó al correo nuevo
              </span>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className={`${settingsInput} text-center font-mono tracking-[0.4em]`}
              />
            </label>
          )
        ) : (
          <label className="mt-2 block">
            <span className={settingsLabel}>Tu contraseña actual</span>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              className={settingsInput}
            />
          </label>
        )}

        <div className="mt-3 flex gap-2">
          {otpEnabled && !codeSent ? (
            <button
              onClick={sendCode}
              disabled={emailBusy || !newEmail.trim()}
              className={settingsButton}
            >
              {emailBusy ? "…" : "Enviarme el código"}
            </button>
          ) : (
            <>
              <button
                onClick={submitEmail}
                disabled={
                  emailBusy ||
                  !newEmail.trim() ||
                  (otpEnabled ? code.length !== 6 : !emailPassword)
                }
                className={settingsButton}
              >
                {emailBusy ? "…" : "Cambiar correo"}
              </button>
              {otpEnabled && (
                <button
                  onClick={sendCode}
                  disabled={emailBusy}
                  className={settingsGhostButton}
                >
                  Reenviar
                </button>
              )}
            </>
          )}
        </div>
        <Feedback error={emailError} info={emailInfo} />
      </SettingsCard>

      <SettingsCard
        title={hasPassword ? "Contraseña" : "Crear contraseña"}
        hint={
          hasPassword
            ? undefined
            : "Tu cuenta entra con Google o con código al correo. Si creás una contraseña, vas a poder entrar también con ella."
        }
      >
        {hasPassword && (
          <label className="block">
            <span className={settingsLabel}>Contraseña actual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className={settingsInput}
            />
          </label>
        )}
        <label className="mt-2 block">
          <span className={settingsLabel}>Contraseña nueva (mín. 8)</span>
          <input
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            autoComplete="new-password"
            className={settingsInput}
          />
        </label>
        <label className="mt-2 block">
          <span className={settingsLabel}>Repetila</span>
          <input
            type="password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            autoComplete="new-password"
            className={settingsInput}
          />
        </label>
        <button
          onClick={submitPassword}
          disabled={
            pwBusy ||
            nextPassword.length < 8 ||
            !repeatPassword ||
            (hasPassword && !currentPassword)
          }
          className={`${settingsButton} mt-3`}
        >
          {pwBusy ? "…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
        </button>
        <Feedback error={pwError} info={pwInfo} />
      </SettingsCard>
    </>
  );
}
