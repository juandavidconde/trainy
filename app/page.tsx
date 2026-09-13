import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Landing from "@/components/Landing";

// La raíz redirigía a /login sin sesión. Eso servía para quien ya era usuario y
// dejaba sin nada a quien recibía el link por primera vez: aterrizaba en un
// formulario de contraseña sin saber qué era Trainy. Ahora la raíz es la landing
// pública, y el atleta con sesión sigue entrando directo a /today.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string | string[] }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/today");

  const { ref } = await searchParams;
  return <Landing refCode={typeof ref === "string" ? ref : undefined} />;
}
