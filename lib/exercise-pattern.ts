// Mapea nombres de ejercicios (en español, como los genera el skill/generador)
// a un patrón de movimiento con ilustración propia. El match es por palabras
// clave en orden de prioridad — lo específico antes que lo genérico.

export type MovementPattern =
  | "squat"
  | "hinge"
  | "hipthrust"
  | "lunge"
  | "legpress"
  | "legext"
  | "legcurl"
  | "calf"
  | "benchpress"
  | "inclinepress"
  | "ohp"
  | "fly"
  | "dips"
  | "pullup"
  | "pulldown"
  | "row"
  | "curl"
  | "triceps"
  | "lateral"
  | "reardelt"
  | "abs"
  | "generic";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

const RULES: { pattern: MovementPattern; keywords: string[] }[] = [
  { pattern: "hipthrust", keywords: ["hip thrust", "puente de gluteo", "glute bridge"] },
  { pattern: "legpress", keywords: ["prensa", "leg press", "hack"] },
  { pattern: "legext", keywords: ["extension de cuadriceps", "extensiones de cuadriceps", "leg extension", "extension de pierna", "extensiones de pierna", "extension de rodilla", "extensiones de rodilla"] },
  { pattern: "legcurl", keywords: ["femoral", "leg curl", "curl de pierna", "curl nordico", "nordic"] },
  { pattern: "calf", keywords: ["pantorrilla", "gemelo", "calf", "soleo"] },
  { pattern: "lunge", keywords: ["zancada", "lunge", "bulgara", "split squat", "estocada", "subida al cajon", "step up"] },
  { pattern: "hinge", keywords: ["peso muerto", "rdl", "rumano", "deadlift", "buenos dias", "good morning", "hiperextension", "back extension", "pull through", "kettlebell swing"] },
  { pattern: "squat", keywords: ["sentadilla", "squat", "goblet"] },
  { pattern: "inclinepress", keywords: ["press inclinado", "incline"] },
  { pattern: "ohp", keywords: ["press militar", "press de hombro", "overhead", "arnold", "press tras nuca", "push press", "landmine press"] },
  { pattern: "fly", keywords: ["apertura", "fly", "cruce de polea", "crossover", "pec deck", "contractora"] },
  { pattern: "dips", keywords: ["fondos", "dips", "paralelas"] },
  { pattern: "benchpress", keywords: ["press banca", "press plano", "bench", "press de pecho", "floor press", "press con mancuernas"] },
  { pattern: "pullup", keywords: ["dominada", "pull up", "pull-up", "chin up", "muscle up"] },
  { pattern: "pulldown", keywords: ["jalon", "pulldown", "pull down", "pullover"] },
  { pattern: "reardelt", keywords: ["posterior", "face pull", "facepull", "pajaro", "reverse fly", "rear delt"] },
  { pattern: "row", keywords: ["remo", "row", "pendlay"] },
  { pattern: "curl", keywords: ["curl", "biceps", "martillo", "predicador", "bayesian"] },
  { pattern: "triceps", keywords: ["triceps", "frances", "press cerrado", "pushdown", "extension de codo", "copa", "skull", "rompecraneos"] },
  { pattern: "lateral", keywords: ["lateral", "elevacion", "hombro lateral"] },
  { pattern: "abs", keywords: ["ab ", "abdominal", "crunch", "plancha", "plank", "rueda", "pallof", "core", "elevacion de piernas", "leg raise", "dead bug"] },
];

export function matchPattern(exerciseName: string): MovementPattern {
  const n = " " + norm(exerciseName) + " ";
  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (n.includes(norm(kw))) return rule.pattern;
    }
  }
  return "generic";
}

export function guideNameKey(exerciseName: string): string {
  return norm(exerciseName).replace(/\s+/g, " ").slice(0, 120);
}
