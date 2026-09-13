import Link from "next/link";
import { CONSENT_VERSION, RESPONSABLE } from "@/lib/consent";

/**
 * Registro de la autorización de tratamiento de datos, visible para el titular.
 *
 * La Ley 1581 le da derecho a "solicitar prueba de la autorización": tenerlo a
 * la vista en Ajustes evita que eso sea un correo y una espera.
 */
export default function ConsentSection({
  acceptedAt,
  version,
}: {
  acceptedAt: Date | null;
  version: string | null;
}) {
  const vigente = !!acceptedAt && version === CONSENT_VERSION;

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <p className="font-display text-sm font-bold uppercase tracking-widest">
        Tus datos
      </p>

      {acceptedAt ? (
        <p className="mt-2 text-sm text-ink-2">
          Autorizaste el tratamiento de tus datos el{" "}
          <span className="font-mono text-ink">
            {new Intl.DateTimeFormat("es-CO", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "America/Bogota",
            }).format(acceptedAt)}
          </span>
          {version && (
            <span className="text-ink-3"> · versión {version}</span>
          )}
          {!vigente && (
            <span className="text-warn">
              {" "}
              — la política cambió desde entonces (versión vigente:{" "}
              {CONSENT_VERSION}).
            </span>
          )}
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-2">
          Tu cuenta es anterior al registro de autorizaciones, así que no hay
          una fecha guardada.
        </p>
      )}

      <p className="mt-3 text-xs text-ink-3">
        Podés consultar, corregir o borrar tus datos cuando quieras: el perfil
        se edita acá arriba y la cuenta se borra más abajo. Para cualquier otra
        solicitud, escribinos a{" "}
        <a
          href={`mailto:${RESPONSABLE.email}`}
          className="text-volt underline-offset-4 hover:underline"
        >
          {RESPONSABLE.email}
        </a>
        .
      </p>

      <Link
        href="/legal"
        className="mt-3 inline-block text-sm text-volt underline-offset-4 hover:underline"
      >
        Ver la política de tratamiento de datos →
      </Link>
    </div>
  );
}
