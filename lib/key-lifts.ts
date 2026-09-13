// Los ejercicios sobre los que se calibra un bloque entero.
//
// El onboarding preguntaba "¿conocés tus marcas?" con un textarea libre y el
// ejemplo "Banca 8×135 lb". Quien no sabe qué es "la banca" —o qué es una
// marca— lo saltaba, y sin PRs el generador cae a estimar por porcentaje de
// peso corporal: pesos de arranque genéricos en las 12 semanas.
//
// Acá cada ejercicio viene explicado en cristiano, para que la pregunta se
// pueda contestar sin saber la jerga.

import type { MovementPattern } from "@/lib/exercise-pattern";

export interface KeyLift {
  key: string;
  /** Nombre como aparecerá en el plan. */
  name: string;
  /** Cómo lo llama la gente en el gimnasio. */
  aka: string;
  /** Qué es, en una frase que se entienda sin haberlo hecho nunca. */
  what: string;
  /** Qué trabaja. */
  muscles: string;
  pattern: MovementPattern;
  /** Se mide en reps, no en carga (dominadas). */
  bodyweight?: boolean;
  /** Peso de referencia para el placeholder, en lb. */
  hint: string;
}

export const KEY_LIFTS: KeyLift[] = [
  {
    key: "sentadilla",
    name: "Sentadilla con barra",
    aka: "squat",
    what: "Con la barra apoyada sobre los hombros (detrás del cuello), bajás doblando rodillas y cadera como si te fueras a sentar, y subís.",
    muscles: "Cuádriceps, glúteo, core",
    pattern: "squat",
    hint: "95",
  },
  {
    key: "peso_muerto",
    name: "Peso muerto",
    aka: "deadlift",
    what: "La barra arranca en el piso. Con la espalda recta, empujás el piso con las piernas y te parás con ella hasta quedar erguida.",
    muscles: "Glúteo, femoral, espalda baja",
    pattern: "hinge",
    hint: "115",
  },
  {
    key: "hip_thrust",
    name: "Hip thrust",
    aka: "empuje de cadera, puente de glúteo con barra",
    what: "Sentada en el piso con la espalda alta apoyada en un banco y la barra sobre la cadera, empujás la cadera hacia arriba hasta quedar en tabla.",
    muscles: "Glúteo (el ejercicio de glúteo por excelencia)",
    pattern: "hipthrust",
    hint: "135",
  },
  {
    key: "prensa",
    name: "Prensa de piernas",
    aka: "leg press",
    what: "Sentada en la máquina, empujás con los pies una plataforma cargada con discos. Es la sentadilla sin cargar peso en la espalda.",
    muscles: "Cuádriceps, glúteo",
    pattern: "legpress",
    hint: "180",
  },
  {
    key: "press_banca",
    name: "Press de banca",
    aka: "la banca, bench press",
    what: "Acostada boca arriba en un banco, bajás la barra hasta el pecho y la empujás hacia arriba hasta estirar los brazos.",
    muscles: "Pecho, hombro frontal, tríceps",
    pattern: "benchpress",
    hint: "65",
  },
  {
    key: "press_hombro",
    name: "Press militar",
    aka: "press de hombro, overhead press",
    what: "De pie o sentada, empujás la barra o las mancuernas desde los hombros hasta arriba de la cabeza.",
    muscles: "Hombros, tríceps",
    pattern: "ohp",
    hint: "45",
  },
  {
    key: "remo",
    name: "Remo con barra",
    aka: "barbell row",
    what: "Inclinada hacia adelante con la espalda recta, jalás la barra desde abajo hasta el abdomen, juntando los omóplatos.",
    muscles: "Espalda media, dorsal, bíceps",
    pattern: "row",
    hint: "65",
  },
  {
    key: "jalon",
    name: "Jalón al pecho",
    aka: "polea alta, lat pulldown",
    what: "Sentada en la máquina de polea, jalás la barra desde arriba hasta el pecho. Es la dominada asistida por la máquina.",
    muscles: "Dorsal (la V de la espalda), bíceps",
    pattern: "pulldown",
    hint: "80",
  },
  {
    key: "dominadas",
    name: "Dominadas",
    aka: "pull ups",
    what: "Colgada de una barra fija, subís hasta pasar la barbilla por encima. Se mide en repeticiones seguidas con tu propio peso.",
    muscles: "Dorsal, bíceps, core",
    pattern: "pullup",
    bodyweight: true,
    hint: "",
  },
];

export interface LiftMark {
  /** Repeticiones que logra con ese peso. */
  reps: string;
  /** Peso en libras. Vacío en los de peso corporal. */
  lb: string;
  /** Marcado explícitamente como "nunca lo he hecho". */
  unknown?: boolean;
}

export type LiftMarks = Record<string, LiftMark>;

/**
 * Pasa las marcas al texto libre que ya consume el generador (`profile.prs`).
 * Mantener el contrato en string evita migrar la columna `User.profile`, que
 * es un JSON serializado de AthleteProfile.
 */
export function serializeMarks(marks: LiftMarks): string {
  const lines: string[] = [];
  for (const lift of KEY_LIFTS) {
    const m = marks[lift.key];
    if (!m || m.unknown) continue;
    const reps = m.reps.trim();
    const lb = m.lb.trim();
    if (!reps && !lb) continue;
    if (lift.bodyweight) {
      if (reps) lines.push(`${lift.name}: ${reps} reps con peso corporal`);
      continue;
    }
    if (reps && lb) lines.push(`${lift.name}: ${reps} reps × ${lb} lb`);
    else if (lb) lines.push(`${lift.name}: ${lb} lb (reps sin especificar)`);
    else lines.push(`${lift.name}: ${reps} reps (peso sin especificar)`);
  }
  const nunca = KEY_LIFTS.filter((l) => marks[l.key]?.unknown).map((l) => l.name);
  if (nunca.length > 0) lines.push(`Nunca ha hecho: ${nunca.join(", ")}`);
  return lines.join("\n");
}

/**
 * Reconstruye las marcas desde el texto guardado, para que volver atrás en el
 * wizard —o retomar un borrador— no borre lo que ya se contestó.
 */
export function parseMarks(prs: string | undefined): LiftMarks {
  const marks: LiftMarks = {};
  if (!prs?.trim()) return marks;
  const nunca = prs.match(/Nunca ha hecho:\s*(.+)/i)?.[1] ?? "";
  for (const lift of KEY_LIFTS) {
    if (nunca.includes(lift.name)) {
      marks[lift.key] = { reps: "", lb: "", unknown: true };
      continue;
    }
    const line = prs
      .split("\n")
      .find((l) => l.toLowerCase().startsWith(lift.name.toLowerCase() + ":"));
    if (!line) continue;
    const reps = line.match(/(\d+)\s*reps/i)?.[1] ?? "";
    const lb = lift.bodyweight ? "" : (line.match(/×\s*(\d+(?:[.,]\d+)?)\s*lb/i)?.[1] ?? line.match(/(\d+(?:[.,]\d+)?)\s*lb/i)?.[1] ?? "");
    marks[lift.key] = { reps, lb };
  }
  return marks;
}
