"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded border border-line px-2.5 py-1 text-xs text-ink-2 hover:border-line-strong hover:text-ink"
    >
      Salir
    </button>
  );
}
