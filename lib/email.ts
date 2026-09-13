// Validación y normalización de correo.
//
// El correo no es un campo de perfil en Trainy: es la llave con la que se entra
// Y con la que el coach publica los bloques. Un typo acá no genera "un dato
// malo", genera una cuenta a la que nadie puede entrar y a la que nadie puede
// escribir. La validación vieja era `email.includes("@")`, que aceptaba
// "noesunemail@" y creaba la cuenta igual.

/** Local@dominio.tld — pide al menos un punto y un TLD alfabético de 2+. */
const SHAPE = /^[^\s@,;:<>()[\]\\"]+@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;

/** Typos frecuentes de los dominios que más usa la gente. */
const TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gamil.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "yahoo.co": "yahoo.com",
  "icloud.co": "icloud.com",
};

export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

export function emailDomain(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1);
}

export interface EmailCheck {
  ok: boolean;
  /** Motivo listo para mostrarle a la persona. */
  error?: string;
  /** Corrección sugerida cuando el dominio parece un typo conocido. */
  suggestion?: string;
}

export function checkEmail(raw: string | null | undefined): EmailCheck {
  const email = normalizeEmail(raw);
  if (!email) return { ok: false, error: "Escribí tu correo" };
  if (email.length > 254) return { ok: false, error: "Ese correo es demasiado largo" };
  if (!email.includes("@")) return { ok: false, error: "Falta el @ en el correo" };
  if (!SHAPE.test(email)) {
    return {
      ok: false,
      error: "Ese correo está incompleto. Revisá que tenga el dominio entero, como nombre@gmail.com",
    };
  }
  const domain = emailDomain(email);
  if (TYPOS[domain]) {
    return {
      ok: false,
      error: `¿Quisiste decir ${email.slice(0, email.lastIndexOf("@") + 1)}${TYPOS[domain]}?`,
      suggestion: `${email.slice(0, email.lastIndexOf("@") + 1)}${TYPOS[domain]}`,
    };
  }
  return { ok: true };
}

/** `true` si el correo es apto para crear cuenta. Atajo para las rutas de API. */
export function isValidEmail(raw: string | null | undefined): boolean {
  return checkEmail(raw).ok;
}
