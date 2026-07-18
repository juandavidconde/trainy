// Perfil estructurado del atleta. Se guarda como JSON string en User.profile
// (columna Text — sin migración de schema). Texto legacy se trata como notas.

export interface AthleteProfile {
  edad?: string;
  sexo?: string;
  peso?: string;
  estatura?: string;
  objetivo?: string;
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
