import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/today");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight">
          Train<span className="text-accent">y</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-400">
          Tu plan de entrenamiento, vivo.
        </p>
      </div>
      <LoginForm googleEnabled={googleEnabled} />
    </main>
  );
}
