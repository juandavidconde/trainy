// Guía de arranque por ejercicio y semana: qué series×reps tocan según la
// progresión del bloque, y con cuánto peso arrancar (último registro o peso S1).
// Es la periodización default del skill Trainy (rep-drop + AMRAP, descargas 70%).

export interface StartGuide {
  target: string; // "2×10 + AMRAP −10%"
  weight: string | null; // "~135 lb c/u"
  basis: string | null; // "S3: 130 lb" | "peso S1"
  /**
   * Cuántas series pide `target`. Sale de la misma rama que arma el texto para
   * que no se desincronicen, y la usa el logger para pintar esa cantidad de
   * filas: antes pintaba 3 fijas, y como al guardar se recortan las filas
   * vacías del final, quien registraba solo la primera serie volvía a la
   * pantalla y encontraba UNA fila.
   */
  sets: number;
}

interface ParsedWeight {
  n: number | null;
  unit: "lb" | "kg";
  suffix: string; // " c/u" si aplica
  bw: boolean;
  plus: boolean; // "+15 lb" = lastre agregado (dominadas, fondos)
}

function parseWeight(raw: string | null | undefined): ParsedWeight | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const bw = /\bbw\b/i.test(s);
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  const n = m ? parseFloat(m[1].replace(",", ".")) : null;
  const unit: "lb" | "kg" = /kg/i.test(s) ? "kg" : "lb";
  const suffix = /c\/u|cada/i.test(s) ? " c/u" : "";
  const plus = s.startsWith("+");
  if (n === null && !bw) return null;
  return { n, unit, suffix, bw, plus };
}

function fmt(w: ParsedWeight, n: number | null): string {
  if (w.bw || w.plus) {
    if (n === null || n === 0) return "BW";
    return `BW+${n} ${w.unit}${w.suffix}`;
  }
  return `${n} ${w.unit}${w.suffix}`;
}

function roundTo(n: number, step: number): number {
  return Math.max(step, Math.round(n / step) * step);
}

/** Posición dentro del ciclo de 6 semanas (S7 arranca ciclo 2). */
function cyclePos(week: number): number {
  return week <= 6 ? week : week - 6;
}

/** Meta de reps "principal" por posición, para detectar rep-drop. */
function compoundRepTarget(pos: number): number {
  if (pos <= 2) return 12;
  if (pos <= 4) return 10;
  return 8;
}

export function buildStartGuide(opts: {
  progression: string | null;
  week: number;
  deloadWeeks: number[];
  startWeight: string | null;
  lastWeight: string | null; // peso más pesado del último registro previo
  lastWeek: number | null;
}): StartGuide | null {
  const { progression, week, deloadWeeks, startWeight, lastWeight, lastWeek } = opts;
  const isDeload = deloadWeeks.includes(week);
  const pos = cyclePos(week);
  const prog = (progression ?? "").toUpperCase();

  // ── Meta de series×reps ──
  let target: string;
  let sets: number;
  if (isDeload) {
    if (prog === "AMRAP_MYO") {
      target = "2 series suaves, lejos del fallo";
      sets = 2;
    } else if (prog === "LIGHT") {
      target = "3×10 suave";
      sets = 3;
    } else {
      target = "3×6 al 70% — semana de descarga";
      sets = 3;
    }
  } else if (prog === "COMPOUND") {
    target = `2×${compoundRepTarget(pos)} + AMRAP −10%`;
    sets = 3;
  } else if (prog === "DOMINADAS") {
    target = pos <= 2 ? "3×8-10" : pos <= 4 ? "3×6-8" : "3×5-6";
    sets = 3;
  } else if (prog === "HYPER" || prog === "HYPER_ALTO") {
    target =
      pos === 1
        ? "AMRAP + 2×10-12"
        : pos === 2
          ? "4×10-12"
          : pos === 3
            ? "3×8-10"
            : pos === 4
              ? "4×8-10"
              : "3×6-8";
    sets = pos === 2 || pos === 4 ? 4 : 3;
  } else if (prog === "LIGHT") {
    target = pos === 1 ? "AMRAP + 3×12-15" : "4×12-15";
    sets = 4;
  } else if (prog === "AMRAP_MYO") {
    target = "AMRAP + myo-reps (bloques de 3-5, descanso 15s)";
    sets = 2;
  } else {
    target = "3-4 series de 8-12";
    sets = 3;
  }

  // ── Peso sugerido ──
  const last = parseWeight(lastWeight);
  const start = parseWeight(startWeight);
  const base = last ?? start;
  let weight: string | null = null;
  let basis: string | null = null;

  if (base) {
    const step = base.unit === "kg" ? 2.5 : 5;
    basis = last
      ? `S${lastWeek}: ${fmt(last, last.n)}`
      : startWeight
        ? `peso S1 del plan`
        : null;

    if (isDeload) {
      weight =
        base.n !== null
          ? `~${fmt(base, roundTo(base.n * 0.7, step))}`
          : "BW o versión asistida";
    } else if (last && lastWeek !== null && base.n !== null) {
      const lastPos = cyclePos(lastWeek);
      const heavy = prog === "COMPOUND" || prog === "DOMINADAS";
      // Reinicio de ciclo (S7 o vuelta tras descarga): la meta de reps sube,
      // así que NO se repite el último peso pesado — se arranca desde el peso
      // S1 con un salto arriba.
      const restarting =
        heavy && pos <= 2 && (deloadWeeks.includes(lastWeek) || lastPos >= 5);
      // Rep-drop: la meta de reps bajó vs. la última semana registrada → +peso
      const dropped =
        heavy &&
        !deloadWeeks.includes(lastWeek) &&
        compoundRepTarget(pos) < compoundRepTarget(lastPos);
      if (restarting && start?.n) {
        weight = `~${fmt(start, start.n + step)} — nuevo ciclo`;
        basis = `peso S1 (${fmt(start, start.n)}) + progreso`;
      } else if (dropped) {
        weight = `subí a ~${fmt(base, base.n + step)}`;
      } else {
        weight = `${fmt(base, base.n)}`;
      }
    } else if (base.n !== null || base.bw) {
      weight = fmt(base, base.n);
      if (week > 2 && !last) basis = "peso S1 — ajustá según cómo te sientas";
    }
  }

  return { target, weight, basis, sets };
}

// ─────────────────────────────────────────────────────────────
// Calentamiento — series de aproximación
// ─────────────────────────────────────────────────────────────

export interface WarmupSet {
  /** "50% × 8" */
  scheme: string;
  weight: string | null;
  rest: string;
}

export interface Warmup {
  exercise: string;
  sets: WarmupSet[];
  /** Qué hacer antes de tocar la barra. */
  general: string;
}

/** Escalones de aproximación: % del peso de trabajo × reps × descanso. */
const RAMP: { pct: number; reps: number; rest: string }[] = [
  { pct: 0.4, reps: 10, rest: "45 s" },
  { pct: 0.6, reps: 8, rest: "45 s" },
  { pct: 0.8, reps: 4, rest: "60 s" },
  { pct: 0.9, reps: 2, rest: "90 s" },
];

/**
 * Calentamiento de la sesión: series de aproximación sobre el primer ejercicio
 * —el compuesto pesado— subiendo carga hasta el peso de trabajo.
 *
 * No entra al registro: son series de preparación, no de trabajo. No suman
 * volumen ni se cuentan como progreso.
 */
export function buildWarmup(opts: {
  exerciseName: string;
  progression: string | null;
  /** Peso de trabajo del día (el que ya calculó buildStartGuide). */
  workingWeight: string | null;
  isDeload: boolean;
}): Warmup | null {
  const { exerciseName, progression, workingWeight, isDeload } = opts;
  const prog = (progression ?? "").toUpperCase();

  const general = isDeload
    ? "3-4 min de movilidad suave. En descarga el calentamiento también baja."
    : "3-5 min de bici, caminadora o elíptica + movilidad de la articulación que vas a usar.";

  const w = parseWeight(workingWeight);

  // Peso corporal (dominadas, fondos, lastre sobre BW): no hay porcentajes que
  // escalar, se aproxima quitando asistencia.
  if (prog === "DOMINADAS" || w?.bw || w?.plus) {
    return {
      exercise: exerciseName,
      general,
      sets: [
        { scheme: "Con banda o asistida × 6", weight: null, rest: "45 s" },
        { scheme: "Sin lastre × 4", weight: null, rest: "60 s" },
      ],
    };
  }

  if (!w || w.n === null || w.n <= 0) {
    // Sin peso de referencia todavía (S1 sin PRs): la aproximación se describe
    // igual, en instrucciones, para que la rutina nunca arranque en frío.
    return {
      exercise: exerciseName,
      general,
      sets: [
        { scheme: "Barra vacía o muy liviano × 10", weight: null, rest: "45 s" },
        { scheme: "Liviano × 8", weight: null, rest: "45 s" },
        { scheme: "Cerca del peso de trabajo × 4", weight: null, rest: "60 s" },
      ],
    };
  }

  const step = w.unit === "kg" ? 2.5 : 5;
  const sets: WarmupSet[] = [];
  let previous = 0;
  for (const r of RAMP) {
    const raw = w.n * r.pct;
    // Escalones que se pisan entre sí (pesos bajos) o que ya llegaron al peso
    // de trabajo no aportan: se descartan.
    const value = roundTo(raw, step);
    if (value <= previous || value >= w.n) continue;
    previous = value;
    sets.push({
      scheme: `${Math.round(r.pct * 100)}% × ${r.reps}`,
      weight: fmt(w, value),
      rest: r.rest,
    });
  }
  if (sets.length === 0) {
    sets.push({ scheme: "Barra vacía × 10", weight: null, rest: "45 s" });
  }
  return { exercise: exerciseName, general, sets };
}
