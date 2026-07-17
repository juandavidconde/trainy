"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-neutral-500 hover:text-neutral-300"
      title="Salir"
    >
      ⎋
    </button>
  );
}
