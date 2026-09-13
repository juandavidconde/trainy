// Prioridad muscular del atleta: qué parte quiere hacer crecer.
//
// Es el dato que decide el REPARTO de sesiones del split, y hasta ahora no se
// preguntaba. Sin él, el generador aplicaba la tabla genérica (5 días → PPL +
// Upper + Lower = 3 de tren superior contra 2 de pierna) y una atleta que
// venía por glúteo y pierna recibía un plan de tren superior.
//
// Fuente única: el wizard pinta las opciones desde acá, el prompt del
// generador recibe la regla literal, y la pantalla final cuenta cuántas
// sesiones acabaron atendiendo la prioridad.

export interface Priority {
  key: string;
  label: string;
  detail: string;
  /** Regla literal que se le inyecta al diseñador del bloque. */
  rule: string;
  /** Detecta si una sesión del plan generado atiende esta prioridad. */
  test: RegExp | null;
}

export const PRIORIDADES: Priority[] = [
  {
    key: "pierna",
    label: "Pierna y glúteo",
    detail: "Glúteo, cuádriceps, femoral",
    rule:
      "La MAYORÍA de las sesiones son de tren inferior. Reparto obligatorio: 3 días → 2 pierna + 1 upper · 4 días → 3 pierna + 1 upper · 5 días → 3 pierna + 2 upper · 6 días → 4 pierna + 2 upper. Al menos UNA de esas sesiones es dominante de glúteo/femoral con hip thrust o empuje de cadera como compuesto principal, y otra dominante de cuádriceps (sentadilla o prensa). Nombres sugeridos: LOWER A, LOWER B, GLÚTEO, UPPER, PUSH, PULL.",
    test: /pierna|lower|glute|glúte|femoral|cuadriceps|cuádriceps|\bleg/i,
  },
  {
    key: "superior",
    label: "Tren superior",
    detail: "Pecho, hombro, espalda, brazos",
    rule:
      "La MAYORÍA de las sesiones son de tren superior. Reparto obligatorio: 3 días → 2 upper + 1 pierna · 4 días → 3 upper + 1 pierna · 5 días → 3 upper + 2 pierna · 6 días → 4 upper + 2 pierna. La pierna nunca desaparece: mínimo una sesión completa por semana.",
    test: /upper|push|pull|pecho|hombro|espalda|brazo|torso|dorsal/i,
  },
  {
    key: "espalda",
    label: "Espalda y hombro",
    detail: "La V de la espalda, deltoides",
    rule:
      "Sesgo a los patrones de tirón (dominada, jalón, remo) y al deltoide. Reparto: al menos 2 sesiones semanales dominantes de espalda/hombro, con volumen de tirón por encima del de empuje (ratio ~2:1). La pierna se mantiene con mínimo una sesión completa.",
    test: /pull|espalda|dorsal|remo|hombro|deltoi/i,
  },
  {
    key: "equilibrado",
    label: "Equilibrado",
    detail: "Todo parejo, sin sesgo",
    rule:
      "Sin sesgo: aplicá la tabla de splits por días y nivel tal cual, con volumen semanal repartido parejo entre tren superior e inferior.",
    test: null,
  },
];

export function findPriority(value: string | undefined): Priority | null {
  if (!value?.trim()) return null;
  const v = value.trim().toLowerCase();
  return (
    PRIORIDADES.find((p) => p.label.toLowerCase() === v) ??
    PRIORIDADES.find((p) => p.key === v) ??
    null
  );
}

/** Cuántas de estas sesiones atienden la prioridad elegida. */
export function countFocused(
  priority: Priority | null,
  sesiones: { name: string; foco?: string | null }[]
): number | null {
  if (!priority?.test) return null;
  return sesiones.filter((s) => priority.test!.test(`${s.name} ${s.foco ?? ""}`)).length;
}
