// Señales que el atleta deja en los comentarios y que nadie estaba leyendo.
//
// El comentario de una serie es el único canal por el que el atleta habla
// mientras entrena, y es justo donde aparece lo que importa: dolor, molestia,
// una serie que no pudo terminar. Hasta ahora se guardaba perfecto y ahí moría:
// no llegaba a Hoy, ni al panel del coach, ni al dossier del Coach IA.
//
// Deliberadamente conservador: preferimos no marcar algo dudoso antes que
// llenar el panel del coach de falsos positivos que lo entrenen a ignorarlo.

export type SignalKind = "dolor" | "molestia" | "corte";

export interface CommentSignal {
  kind: SignalKind;
  /** El comentario original, para que el coach lea la frase entera. */
  text: string;
  week: number;
  exerciseName: string;
  date: Date | null;
}

const NEGATIONS = /\bsin (dolor|molestia)|no (me )?(dolió|duele|molest)|nada de dolor|cero dolor/i;

const PATTERNS: { kind: SignalKind; re: RegExp }[] = [
  // Lo que exige atención hoy
  { kind: "dolor", re: /\bdolor\b|\bme duele\b|\bdolió\b|punzada|pinchazo|lesion|lesión|desgarr/i },
  // Aviso temprano
  { kind: "molestia", re: /molestia|molest[oó]|incomod|tirantez|resentid/i },
  // Tuvo que abandonar el ejercicio
  { kind: "corte", re: /tuve que parar|no pude (terminar|seguir|completar)|par[eé] (antes|la serie)|abandon[eé]|corté la serie/i },
];

/** Clasifica un comentario. `null` si no hay nada que reportar. */
export function classifyComment(comment: string | null | undefined): SignalKind | null {
  const text = (comment ?? "").trim();
  if (!text) return null;
  if (NEGATIONS.test(text)) return null;
  // Orden de severidad: un comentario que dice "dolor" y "tuve que parar"
  // se reporta como dolor.
  for (const { kind, re } of PATTERNS) {
    if (re.test(text)) return kind;
  }
  return null;
}

export const SIGNAL_LABEL: Record<SignalKind, string> = {
  dolor: "dolor",
  molestia: "molestia",
  corte: "sesión cortada",
};

/** Severidad para ordenar y para decidir el color del chip. */
export const SIGNAL_RANK: Record<SignalKind, number> = {
  dolor: 0,
  corte: 1,
  molestia: 2,
};

interface LogWithComment {
  week: number;
  comment: string | null;
  date: Date | null;
  exercise?: { name: string } | null;
}

/**
 * Señales de una tanda de registros, lo más severo y reciente primero.
 * `withinWeeks` acota a lo que sigue siendo accionable: un dolor de hace dos
 * meses ya no es una alerta, es historia.
 */
export function collectSignals(
  logs: LogWithComment[],
  opts: { currentWeek: number; withinWeeks?: number } = { currentWeek: 1 }
): CommentSignal[] {
  const from = opts.withinWeeks ? opts.currentWeek - opts.withinWeeks : -Infinity;
  const out: CommentSignal[] = [];
  for (const log of logs) {
    if (log.week < from) continue;
    const kind = classifyComment(log.comment);
    if (!kind) continue;
    out.push({
      kind,
      text: (log.comment ?? "").trim(),
      week: log.week,
      exerciseName: log.exercise?.name ?? "",
      date: log.date ?? null,
    });
  }
  return out.sort(
    (a, b) => SIGNAL_RANK[a.kind] - SIGNAL_RANK[b.kind] || b.week - a.week
  );
}
