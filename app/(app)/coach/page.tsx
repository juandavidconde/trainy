import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { loadRoster } from "@/lib/roster";
import ImportPanel from "@/components/ImportPanel";
import AddAthlete from "@/components/coach/AddAthlete";
import RosterList from "@/components/coach/RosterList";

export default async function CoachPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.role !== "COACH") redirect("/today");

  const roster = await loadRoster(user.id);
  const needAttention = roster.filter(
    (r) => r.status === "inactivo" || r.status === "atrasado"
  ).length;
  const finished = roster.filter((r) => r.status === "bloque-terminado").length;
  const hurting = roster.filter((r) => r.signal).length;
  const training = roster.filter((r) => r.plan).length;

  return (
    <div className="space-y-4 md:mx-auto md:max-w-2xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-xl font-bold">Atletas</h1>
        <p className="font-mono text-[11px] text-ink-3">
          {training} entrenando
          {needAttention > 0 && <span className="text-warn"> · {needAttention} a revisar</span>}
          {finished > 0 && <span className="text-volt"> · {finished} para renovar</span>}
          {hurting > 0 && <span className="text-err"> · {hurting} con dolor</span>}
        </p>
      </div>

      <AddAthlete />
      <RosterList roster={roster} />
      <ImportPanel />
    </div>
  );
}
