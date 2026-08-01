import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import { DesktopNav, BottomNav, NavItem } from "@/components/NavBar";
import { aiCoachEnabled } from "@/lib/coach-ai";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const items: NavItem[] = [
    { href: "/today", label: "Hoy", icon: "dumbbell", noPrefetch: true },
    { href: "/history", label: "Historial", icon: "calendar" },
    { href: "/progress", label: "Progreso", icon: "chart" },
    { href: "/guide", label: "Guía", icon: "book" },
    ...(aiCoachEnabled()
      ? [{ href: "/ai", label: "Coach IA", icon: "spark" as const }]
      : []),
    ...(user.role === "COACH"
      ? [{ href: "/coach", label: "Atletas", icon: "users" as const }]
      : []),
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md md:max-w-5xl md:px-8">
      <header className="flex items-center justify-between gap-4 px-4 pb-2 pt-4 md:px-0 md:py-5">
        <div className="flex items-center gap-8">
          <Link
            href="/today"
            prefetch={false}
            className="font-display text-lg font-bold tracking-tight md:text-xl"
          >
            Train<span className="text-volt">y</span>
          </Link>
          <DesktopNav items={items} />
        </div>
        <Link
          href="/settings"
          aria-label="Ajustes"
          className="flex items-center gap-2 rounded border border-line px-2.5 py-1 text-sm text-ink-2 hover:border-line-strong hover:text-ink"
        >
          <span className="max-w-[8rem] truncate md:max-w-none">
            {user.name ?? user.email}
          </span>
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </Link>
      </header>

      <main className="px-4 pb-32 md:px-0 md:pb-16">{children}</main>

      <BottomNav items={items} />
    </div>
  );
}
