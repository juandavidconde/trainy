import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import { aiCoachEnabled } from "@/lib/coach-ai";
import { parseProfile } from "@/lib/profile";
import CoachChat from "@/components/CoachChat";

export default async function AiCoachPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!aiCoachEnabled()) redirect("/today");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profile: true },
  });

  return <CoachChat initialProfile={parseProfile(dbUser?.profile)} />;
}
