import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/today");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">
          Train<span className="text-volt">y</span>
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-wider text-ink-3">
          Tu plan de entrenamiento, vivo.
        </p>
      </div>
      <LoginForm googleEnabled={googleEnabled} />
    </main>
  );
}
