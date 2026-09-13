import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { otpEnabled } from "@/lib/otp";
import { parseProfile } from "@/lib/profile";
import ProfileSection from "@/components/settings/ProfileSection";
import AccountSection from "@/components/settings/AccountSection";
import TrainingSection from "@/components/settings/TrainingSection";
import ScheduleModeSection from "@/components/settings/ScheduleModeSection";
import DataSection from "@/components/settings/DataSection";
import ConsentSection from "@/components/settings/ConsentSection";
import SignOutButton from "@/components/SignOutButton";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { name: true, startDate: true, weeks: true },
  });

  return (
    <div className="space-y-4 md:mx-auto md:max-w-2xl">
      <h1 className="text-xl font-bold">Ajustes</h1>

      <ProfileSection
        initialName={user.name ?? ""}
        initialProfile={parseProfile(user.profile)}
      />

      <AccountSection
        currentEmail={user.email}
        hasPassword={!!user.passwordHash}
        otpEnabled={otpEnabled()}
      />

      <TrainingSection
        planName={plan?.name ?? null}
        startDateIso={plan?.startDate?.toISOString().slice(0, 10) ?? null}
        weeks={plan?.weeks ?? 12}
      />

      <ScheduleModeSection mode={user.scheduleMode} />

      <ConsentSection
        acceptedAt={user.consentAcceptedAt}
        version={user.consentVersion}
      />

      <DataSection hasPlan={!!plan} />

      <div className="flex items-center justify-between rounded-lg border border-line bg-surface p-4">
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-widest">
            Sesión
          </p>
          <p className="mt-0.5 font-mono text-xs text-ink-3">{user.email}</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
