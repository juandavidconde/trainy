// Interpretación del peso registrado.
//
// El peso se guarda como texto libre porque así viene del skill y así lo escribe
// el atleta ("115 lb", "20 kg c/u", "+15 lb", "BW"). Eso está bien para guardar,
// pero todo lo que se calcula encima —gráficas, PRs, e1RM— necesita saber QUÉ
// significa ese texto. El parser viejo tomaba el primer número que encontraba,
// así que "14 kg c/u" (por lado) valía 14 al lado de un "115 lb" total, "+15 lb"
// de dominadas lastradas valía 15 como si eso fuera la carga, y "BW" se
// descartaba entero — el principiante que entrena con su peso corporal se
// quedaba sin página de progreso.

export type Unit = "kg" | "lb";

export interface ParsedWeight {
  /** Número tal como lo escribió la persona, sin normalizar. */
  raw: number | null;
  unit: Unit | null;
  /** "c/u", "cada uno", "por lado" → la carga total es el doble. */
  perSide: boolean;
  /** Peso corporal, con o sin lastre ("BW", "BW+10", "+15 lb"). */
  bodyweight: boolean;
  /** Carga total en la unidad original: raw × 2 si es por lado. */
  total: number | null;
  original: string;
}

const KG_PER_LB = 0.45359237;

export function parseWeight(input: string | null | undefined): ParsedWeight {
  const original = (input ?? "").trim();
  const empty: ParsedWeight = {
    raw: null, unit: null, perSide: false, bodyweight: false, total: null, original,
  };
  if (!original) return empty;

  const s = original.toLowerCase();
  const bodyweight = /\bbw\b|peso corporal|corporal/.test(s) || /^\s*\+/.test(original);
  const perSide = /c\/u|c\/ u|cada uno|cada lado|por lado|\bpl\b/.test(s);

  const m = s.match(/-?\d+(?:[.,]\d+)?/);
  const raw = m ? parseFloat(m[0].replace(",", ".")) : null;

  let unit: Unit | null = null;
  if (/\bkgs?\b|kilo/.test(s)) unit = "kg";
  else if (/\blbs?\b|libra|pound/.test(s)) unit = "lb";

  // "BW" sola no tiene número y no es un cero: es "tu propio peso".
  if (raw === null) {
    return { ...empty, bodyweight, perSide, unit };
  }
  return {
    raw, unit, perSide, bodyweight,
    total: perSide ? raw * 2 : raw,
    original,
  };
}

/** Convierte a la unidad destino. Sin unidad declarada asume la del destino. */
export function toUnit(value: number, from: Unit | null, to: Unit): number {
  if (!from || from === to) return value;
  return to === "kg" ? value * KG_PER_LB : value / KG_PER_LB;
}

/**
 * Carga comparable de una serie, en la unidad pedida.
 *
 * `bodyweightKg` es el peso corporal del atleta (de su perfil). Con él, las
 * dominadas y los fondos entran a la misma escala que la barra: "BW" vale su
 * peso, "BW+15 lb" vale peso + 15. Sin él, los ejercicios de peso corporal
 * devuelven null en vez de mentir con un 15 suelto.
 */
export function comparableLoad(
  w: ParsedWeight,
  to: Unit,
  bodyweightKg: number | null
): number | null {
  if (w.bodyweight) {
    if (bodyweightKg === null) return null;
    const base = toUnit(bodyweightKg, "kg", to);
    const extra = w.total !== null ? toUnit(w.total, w.unit ?? to, to) : 0;
    return base + extra;
  }
  if (w.total === null) return null;
  return toUnit(w.total, w.unit ?? to, to);
}

/** Epley. Por encima de ~12 reps deja de ser fiable, así que se corta. */
export function estimate1RM(load: number, reps: number): number | null {
  if (!Number.isFinite(load) || !Number.isFinite(reps)) return null;
  if (load <= 0 || reps <= 0 || reps > 15) return null;
  return load * (1 + reps / 30);
}

/** Reps de una serie. "AMRAP" o "8-10" → el número que se pueda leer. */
export function parseReps(input: string | null | undefined): number | null {
  const s = (input ?? "").trim();
  if (!s) return null;
  const m = s.match(/\d+/);
  if (!m) return null;
  const n = parseInt(m[0], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tally(weights: (string | null | undefined)[]): { kg: number; lb: number } {
  let kg = 0;
  let lb = 0;
  for (const raw of weights) {
    const u = parseWeight(raw).unit;
    if (u === "kg") kg++;
    else if (u === "lb") lb++;
  }
  return { kg, lb };
}

/**
 * Unidad dominante — la que se muestra en los ejes.
 *
 * Antes el gráfico decía "kg" fijo aunque el bloque entero estuviera en libras.
 * Ahora se mira lo que escribe el atleta y, si no declara unidad (lo normal:
 * anota "120", no "120 lb"), se hereda la del plan, donde el coach sí la
 * escribió ("peso_s1": "115 lb"). Ese es el caso corriente y el que hacía que
 * un bloque entero en libras se rotulara en kilos.
 */
export function dominantUnit(
  weights: (string | null | undefined)[],
  planWeights: (string | null | undefined)[] = []
): Unit {
  const fromLogs = tally(weights);
  if (fromLogs.lb > fromLogs.kg) return "lb";
  if (fromLogs.kg > fromLogs.lb) return "kg";
  // Empate o silencio en los registros: manda lo que dice el plan.
  const fromPlan = tally(planWeights);
  if (fromPlan.lb > fromPlan.kg) return "lb";
  return "kg";
}

/** Peso corporal del atleta desde su perfil ("82 kg", "180 lb"), en kg. */
export function bodyweightKgFromProfile(peso: string | null | undefined): number | null {
  const w = parseWeight(peso);
  if (w.raw === null) return null;
  const unit: Unit = w.unit ?? "kg";
  return toUnit(w.raw, unit, "kg");
}

/** Etiqueta corta para mostrar una carga ya normalizada. */
export function formatLoad(value: number, unit: Unit): string {
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}
