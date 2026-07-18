import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { prisma } from "@/lib/prisma";
import GuideList, { GuideExercise } from "@/components/GuideList";
import { matchPattern } from "@/lib/exercise-pattern";
import { sessionColor } from "@/lib/brand";

export default async function GuidePage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const plan = await prisma.plan.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
    include: {
      sessions: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });

  const exercises: GuideExercise[] = [];
  const seen = new Set<string>();
  for (const session of plan?.sessions ?? []) {
    for (const ex of session.exercises) {
      const key = ex.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      exercises.push({
        name: ex.name,
        session: session.name,
        color: sessionColor(session.name, session.color),
        pattern: matchPattern(ex.name),
        progression: ex.progression,
        tempo: ex.tempo,
        notes: ex.notes,
      });
    }
  }

  return <GuideList exercises={exercises} />;
}
