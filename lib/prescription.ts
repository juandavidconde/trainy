// Guía de arranque por ejercicio y semana: qué series×reps tocan según la
// progresión del bloque, y con cuánto peso arrancar (último registro o peso S1).
// Es la periodización default del skill Trainy (rep-drop + AMRAP, descargas 70%).

export interface StartGuide {
  target: string; // "2×10 + AMRAP −10%"
  weight: string | null; // "~135 lb c/u"
  basis: string | null; // "S3: 130 lb" | "peso S1"
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
  if (isDeload) {
    target =
      prog === "AMRAP_MYO"
        ? "2 series suaves, lejos del fallo"
        : prog === "LIGHT"
          ? "3×10 suave"
          : "3×6 al 70% — semana de descarga";
  } else if (prog === "COMPOUND") {
    target = `2×${compoundRepTarget(pos)} + AMRAP −10%`;
  } else if (prog === "DOMINADAS") {
    target = pos <= 2 ? "3×8-10" : pos <= 4 ? "3×6-8" : "3×5-6";
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
  } else if (prog === "LIGHT") {
    target = pos === 1 ? "AMRAP + 3×12-15" : "4×12-15";
  } else if (prog === "AMRAP_MYO") {
    target = "AMRAP + myo-reps (bloques de 3-5, descanso 15s)";
  } else {
    target = "3-4 series de 8-12";
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

  return { target, weight, basis };
}
