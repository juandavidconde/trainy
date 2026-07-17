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
    <div className="mx-auto min-h-dvh max-w-md">
      <header className="flex items-center justify-between px-4 pb-2 pt-4">
        <span className="text-lg font-black tracking-tight">
          Train<span className="text-accent">y</span>
        </span>
        <div className="flex items-center gap-3 text-sm text-neutral-400">
          <span className="max-w-[10rem] truncate">{user.name ?? user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <main className="px-4 pb-28">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-card/95 backdrop-blur">
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
