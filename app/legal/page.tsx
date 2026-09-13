// Política de tratamiento de datos, pública y sin login: tiene que poder
// leerse ANTES de aceptarla, y quien ya borró su cuenta debe seguir pudiendo
// consultarla.
import Link from "next/link";
import PolicyText from "@/components/PolicyText";
import { CONSENT_VERSION, POLICY, RESPONSABLE } from "@/lib/consent";

export const metadata = {
  title: "Tratamiento de datos · Trainy",
  description:
    "Política de tratamiento de datos personales de Trainy — Ley 1581 de 2012.",
};

export default function LegalPage() {
  const contacto = [
    RESPONSABLE.direccion,
    RESPONSABLE.ciudad,
    RESPONSABLE.telefono,
  ].filter(Boolean);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-8">
      <Link
        href="/today"
        className="font-mono text-[11px] uppercase tracking-wider text-ink-3 underline-offset-4 hover:text-ink-2 hover:underline"
      >
        ← Volver
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold">
        Tratamiento de datos personales
      </h1>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
        Versión {CONSENT_VERSION} · Ley 1581 de 2012 (Colombia)
      </p>

      <p className="mt-5 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-2">
        Esto está escrito para que se entienda, no para que nadie se lo salte.
        Si algo no te queda claro, escribinos a{" "}
        <a
          href={`mailto:${RESPONSABLE.email}`}
          className="text-volt underline-offset-4 hover:underline"
        >
          {RESPONSABLE.email}
        </a>
        .
      </p>

      <div className="mt-8">
        <PolicyText sections={POLICY} />
      </div>

      <footer className="mt-10 border-t border-line pt-4 font-mono text-[11px] text-ink-3">
        <p>
          {RESPONSABLE.nombre} · {RESPONSABLE.calidad}
        </p>
        <p className="mt-0.5">{RESPONSABLE.email}</p>
        {contacto.length > 0 && <p className="mt-0.5">{contacto.join(" · ")}</p>}
      </footer>
    </main>
  );
}
