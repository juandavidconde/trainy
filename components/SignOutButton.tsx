"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="rounded-lg border border-neutral-800 px-2.5 py-1 text-xs text-neutral-400 hover:border-neutral-600 hover:text-neutral-200"
    >
      Salir
    </button>
  );
}
