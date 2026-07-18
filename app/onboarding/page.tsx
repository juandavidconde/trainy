import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseProfile } from "@/lib/profile";
import { aiCoachEnabled } from "@/lib/coach-ai";
import OnboardingWizard from "@/components/OnboardingWizard";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, profile: true },
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 py-6">
      <OnboardingWizard
        initialName={dbUser?.name ?? ""}
        initialProfile={parseProfile(dbUser?.profile)}
        canGenerate={aiCoachEnabled()}
      />
    </main>
  );
}
