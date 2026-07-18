import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import SignOutButton from "@/components/SignOutButton";
import { DesktopNav, BottomNav, NavItem } from "@/components/NavBar";
import { aiCoachEnabled } from "@/lib/coach-ai";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const items: NavItem[] = [
    { href: "/today", label: "Hoy", icon: "dumbbell" },
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
            className="font-display text-lg font-bold tracking-tight md:text-xl"
          >
            Train<span className="text-volt">y</span>
          </Link>
          <DesktopNav items={items} />
        </div>
        <div className="flex items-center gap-3 text-sm text-ink-2">
          <span className="max-w-[9rem] truncate md:max-w-none">
            {user.name ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="px-4 pb-32 md:px-0 md:pb-16">{children}</main>

      <BottomNav items={items} />
    </div>
  );
}
