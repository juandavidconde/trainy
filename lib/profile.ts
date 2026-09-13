// Perfil estructurado del atleta. Se guarda como JSON string en User.profile
// (columna Text — sin migración de schema). Texto legacy se trata como notas.

export interface AthleteProfile {
  edad?: string;
  sexo?: string;
  peso?: string;
  estatura?: string;
  objetivo?: string;
  /**
   * Qué parte del cuerpo quiere hacer crecer. Es lo que decide el reparto de
   * sesiones del split, y hasta ahora no se preguntaba: el generador caía
   * siempre en la tabla genérica (5 días → 3 upper / 2 lower) y una atleta que
   * venía por pierna recibía un plan de tren superior.
   */
  prioridad?: string;
  experiencia?: string;
  lesiones?: string;
  deporte?: string;
  prs?: string;
  notas?: string;
}

export const PROFILE_FIELDS: {
  key: keyof AthleteProfile;
  label: string;
  placeholder: string;
  required: boolean;
  long?: boolean;
}[] = [
  { key: "edad", label: "Edad", placeholder: "38", required: true },
  { key: "sexo", label: "Sexo", placeholder: "M / F", required: true },
  { key: "peso", label: "Peso", placeholder: "82 kg", required: true },
  { key: "estatura", label: "Estatura", placeholder: "178 cm", required: true },
  { key: "objetivo", label: "Objetivo", placeholder: "Hipertrofia / recomposición / fuerza", required: true },
  // No es `required` a propósito: los perfiles creados antes de que existiera
  // este campo se quedarían sin poder regenerar su bloque (missingRequired
  // devuelve 400 en /api/generate-plan). El onboarding sí lo exige.
  { key: "prioridad", label: "Qué querés hacer crecer", placeholder: "Pierna y glúteo / Tren superior / Espalda / Equilibrado", required: false },
  { key: "experiencia", label: "Experiencia", placeholder: "8 años entrenando, nivel avanzado", required: true },
  { key: "lesiones", label: "Lesiones o molestias", placeholder: "Molestia en hombro izquierdo con press tras nuca. Ninguna → escribí \"ninguna\"", required: true, long: true },
  { key: "deporte", label: "Otro deporte que practiques", placeholder: "Running 20 km/sem, fútbol los sábados... Ninguno → escribí \"ninguno\"", required: false, long: true },
  { key: "prs", label: "PRs conocidos", placeholder: "Banca 8×135 lb, sentadilla 10×185 lb, dominadas 12×BW...", required: false, long: true },
  { key: "notas", label: "Notas para el coach", placeholder: "Preferencias, horarios, equipo disponible, suplementación...", required: false, long: true },
];

export function parseProfile(raw: string | null | undefined): AthleteProfile {
  if (!raw?.trim()) return {};
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) return p as AthleteProfile;
  } catch {
    // legacy: texto libre
  }
  return { notas: raw.trim() };
}

export function serializeProfile(p: AthleteProfile): string | null {
  const clean: AthleteProfile = {};
  for (const { key } of PROFILE_FIELDS) {
    const v = (p[key] ?? "").toString().trim().slice(0, 600);
    if (v) clean[key] = v;
  }
  return Object.keys(clean).length > 0 ? JSON.stringify(clean) : null;
}

export function missingRequired(p: AthleteProfile): string[] {
  return PROFILE_FIELDS.filter((f) => f.required && !(p[f.key] ?? "").toString().trim()).map(
    (f) => f.label
  );
}

/** Render para el dossier del Coach IA. */
export function profileToText(p: AthleteProfile): string {
  const lines: string[] = [];
  for (const f of PROFILE_FIELDS) {
    const v = (p[f.key] ?? "").toString().trim();
    if (v) lines.push(`${f.label}: ${v}`);
  }
  const missing = missingRequired(p);
  if (missing.length > 0) {
    lines.push(
      `(Campos sin llenar: ${missing.join(", ")} — si son relevantes para la pregunta, pedile al atleta que complete "Mi perfil")`
    );
  }
  return lines.join("\n");
}
