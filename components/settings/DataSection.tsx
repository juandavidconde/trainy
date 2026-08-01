"use client";

import { useRouter } from "next/navigation";
import { resetBlock, startFresh } from "@/lib/account-actions";
import SettingsCard from "@/components/settings/SettingsCard";
import DangerAction from "@/components/settings/DangerAction";

export default function DataSection({ hasPlan }: { hasPlan: boolean }) {
  const router = useRouter();

  return (
    <SettingsCard
      title="Datos"
      hint="Tu historial es tuyo: podés bajarlo cuando quieras. Lo de abajo no se puede deshacer."
    >
      <a
        href="/api/export/tracker"
        download="trainy-historial.json"
        className="inline-flex h-11 items-center rounded border border-line-strong px-4 font-display text-sm font-bold text-ink-2 active:bg-raised"
      >
        Descargar mi historial (JSON)
      </a>

      {hasPlan && (
        <div className="mt-4 space-y-3">
          <DangerAction
            label="Reiniciar el bloque"
            description="Borra todos los registros de este bloque y lo deja en Semana 1 arrancando hoy. El plan (sesiones y ejercicios) se conserva."
            confirmWord="REINICIAR"
            action={resetBlock}
            onDone={() => router.refresh()}
          />
          <DangerAction
            label="Empezar de cero"
            description="Borra el bloque activo completo — plan y registros — y te lleva a armar uno nuevo. Los bloques ya archivados no se tocan."
            confirmWord="EMPEZAR"
            action={startFresh}
            onDone={() => {
              router.push("/onboarding");
              router.refresh();
            }}
          />
        </div>
      )}
    </SettingsCard>
  );
}
