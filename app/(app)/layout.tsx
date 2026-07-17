import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/auth";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();
  if (!user) redirect("/login");

  const items = [
    { href: "/today", label: "Hoy", icon: "🏋️" },
    { href: "/history", label: "Historial", icon: "📅" },
    { href: "/progress", label: "Progreso", icon: "📈" },
    ...(user.role === "COACH"
      ? [{ href: "/coach", label: "Coach", icon: "🧠" }]
      : []),
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md md:max-w-5xl md:px-8">
      <header className="flex items-center justify-between gap-4 px-4 pb-2 pt-4 md:px-0 md:py-5">
        <div className="flex items-center gap-8">
          <Link href="/today" className="text-lg font-black tracking-tight md:text-xl">
            Train<span className="text-accent">y</span>
          </Link>
          {/* Nav de escritorio */}
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-neutral-300 hover:bg-card hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span className="max-w-[9rem] truncate md:max-w-none">
            {user.name ?? user.email}
          </span>
          <SignOutButton />
        </div>
      </header>

      <main className="px-4 pb-32 md:px-0 md:pb-16">{children}</main>

      {/* Nav inferior — solo móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs text-neutral-300 active:text-accent"
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
