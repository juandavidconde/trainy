import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, googleEnabled } from "@/auth";
import { otpEnabled } from "@/lib/otp";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string | string[]; ref?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/today");

  // `?nuevo=1` llega desde el botón "Crear mi cuenta" de la landing. Sin esto
  // el recién llegado aterriza en el formulario de entrar y tiene que darse
  // cuenta solo de que el link chiquito de abajo es el que necesitaba.
  const { nuevo, ref } = await searchParams;
  const isNew = nuevo === "1" || nuevo === "true";

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
      <LoginForm
        googleEnabled={googleEnabled}
        otpEnabled={otpEnabled()}
        initialMode={isNew ? "register" : "login"}
        refCode={typeof ref === "string" ? ref : undefined}
      />

      {/* La política tiene que ser alcanzable ANTES de crear la cuenta. */}
      <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-wider text-ink-3">
        <Link href="/legal" className="underline-offset-4 hover:text-ink-2 hover:underline">
          Tratamiento de datos
        </Link>
      </p>
    </main>
  );
}
