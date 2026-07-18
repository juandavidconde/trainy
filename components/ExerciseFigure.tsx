import { MovementPattern } from "@/lib/exercise-pattern";

/**
 * Ilustraciones de línea por patrón de movimiento. Grammar consistente:
 * figura de palo vista lateral, barra con discos = línea + círculos,
 * flecha punteada = dirección del movimiento. Stroke = currentColor,
 * así heredan el color de sesión o el acento.
 */
export default function ExerciseFigure({
  pattern,
  className,
}: {
  pattern: MovementPattern;
  className?: string;
}) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const arrow = {
    ...p,
    strokeWidth: 1.6,
    strokeDasharray: "3 3",
    opacity: 0.75,
  };

  const svg = (children: React.ReactNode) => (
    <svg viewBox="0 0 96 64" className={className} aria-hidden="true">
      {children}
    </svg>
  );

  switch (pattern) {
    case "squat":
      return svg(
        <>
          <circle cx="44" cy="14" r="5" {...p} />
          {/* barra sobre hombros */}
          <line x1="24" y1="22" x2="66" y2="22" {...p} />
          <circle cx="24" cy="22" r="3.5" {...p} />
          <circle cx="66" cy="22" r="3.5" {...p} />
          {/* torso inclinado, muslos paralelos, tibias */}
          <path d="M45 22 L40 36 L52 40 L50 54 L58 54" {...p} />
          <path d="M40 36 L34 52 L26 52" {...p} />
          <path d="M74 30 v14 M71 41 l3 4 3-4" {...arrow} />
        </>
      );
    case "hinge":
      return svg(
        <>
          <circle cx="60" cy="18" r="5" {...p} />
          {/* torso bisagra, cadera atrás */}
          <path d="M56 21 L38 30 L34 46 L28 58" {...p} />
          <path d="M34 46 L44 58" {...p} />
          {/* brazos colgando a la barra */}
          <path d="M52 24 L50 40" {...p} />
          <line x1="40" y1="42" x2="62" y2="42" {...p} />
          <circle cx="40" cy="42" r="3.5" {...p} />
          <circle cx="62" cy="42" r="3.5" {...p} />
          <path d="M74 40 q8 -10 2 -20 M79 22 l-3 -3 -1 5" {...arrow} />
        </>
      );
    case "hipthrust":
      return svg(
        <>
          {/* banco */}
          <rect x="10" y="24" width="16" height="10" {...p} />
          <circle cx="22" cy="14" r="5" {...p} />
          {/* torso puente + piernas */}
          <path d="M27 17 L48 30 L60 30 L66 44 L58 56" {...p} />
          <path d="M66 44 L76 56" {...p} />
          {/* barra en cadera */}
          <line x1="42" y1="22" x2="58" y2="22" {...p} />
          <circle cx="42" cy="22" r="3.5" {...p} />
          <circle cx="58" cy="22" r="3.5" {...p} />
          <path d="M50 12 v-6 M47 8 l3 -4 3 4" {...arrow} />
        </>
      );
    case "lunge":
      return svg(
        <>
          <circle cx="46" cy="10" r="5" {...p} />
          <path d="M46 15 L46 32" {...p} />
          {/* pierna delantera 90° y trasera extendida */}
          <path d="M46 32 L34 38 L34 54 L26 54" {...p} />
          <path d="M46 32 L58 44 L70 52" {...p} />
          {/* mancuernas */}
          <circle cx="38" cy="34" r="2.5" {...p} />
          <circle cx="54" cy="34" r="2.5" {...p} />
          <path d="M80 34 v14 M77 45 l3 4 3-4" {...arrow} />
        </>
      );
    case "legpress":
      return svg(
        <>
          {/* asiento reclinado */}
          <path d="M14 52 L30 40 L44 46" {...p} />
          <circle cx="26" cy="32" r="5" {...p} />
          <path d="M30 36 L42 44" {...p} />
          {/* piernas hacia plataforma */}
          <path d="M42 44 L58 34 L70 26" {...p} />
          {/* plataforma */}
          <path d="M74 16 L82 34" {...p} />
          <path d="M60 14 l12 -4 M69 7 l5 2 -2 5" {...arrow} />
        </>
      );
    case "legext":
      return svg(
        <>
          {/* banco vertical */}
          <path d="M30 20 L30 44 L18 56" {...p} />
          <circle cx="34" cy="12" r="5" {...p} />
          <path d="M34 17 L32 40" {...p} />
          {/* muslo horizontal + tibia extendiéndose */}
          <path d="M32 40 L52 40 L66 32" {...p} />
          <circle cx="66" cy="32" r="2.5" {...p} />
          <path d="M60 52 q10 -2 10 -14 M68 44 l3 -4 1 5" {...arrow} />
        </>
      );
    case "legcurl":
      return svg(
        <>
          {/* banco horizontal */}
          <line x1="14" y1="46" x2="66" y2="46" {...p} />
          <circle cx="20" cy="38" r="5" {...p} />
          {/* cuerpo boca abajo */}
          <path d="M25 41 L54 42" {...p} />
          {/* tibia curleando hacia glúteo */}
          <path d="M54 42 L66 30" {...p} />
          <circle cx="66" cy="30" r="2.5" {...p} />
          <path d="M78 44 q2 -14 -8 -16 M73 26 l-4 1 2 4" {...arrow} />
        </>
      );
    case "calf":
      return svg(
        <>
          {/* escalón */}
          <path d="M56 58 h20 v-6 h-20 z" {...p} />
          <circle cx="60" cy="10" r="5" {...p} />
          {/* cuerpo vertical, talón elevado */}
          <path d="M60 15 L60 38 L62 50" {...p} />
          <path d="M62 50 L68 52 L72 48" {...p} />
          <path d="M40 40 v-12 M37 31 l3 -4 3 4" {...arrow} />
        </>
      );
    case "benchpress":
      return svg(
        <>
          {/* banco */}
          <line x1="18" y1="48" x2="70" y2="48" {...p} />
          <line x1="26" y1="48" x2="26" y2="58" {...p} />
          <line x1="60" y1="48" x2="60" y2="58" {...p} />
          <circle cx="26" cy="40" r="5" {...p} />
          <path d="M31 42 L64 42" {...p} />
          {/* brazos empujando barra arriba */}
          <path d="M44 42 L44 26" {...p} />
          <line x1="32" y1="24" x2="58" y2="24" {...p} />
          <circle cx="32" cy="24" r="3.5" {...p} />
          <circle cx="58" cy="24" r="3.5" {...p} />
          <path d="M74 34 v-14 M71 23 l3 -4 3 4" {...arrow} />
        </>
      );
    case "inclinepress":
      return svg(
        <>
          {/* banco inclinado */}
          <path d="M16 56 L40 40 L58 46" {...p} />
          <circle cx="40" cy="28" r="5" {...p} />
          <path d="M42 32 L54 44" {...p} />
          {/* brazo empujando en diagonal */}
          <path d="M48 36 L58 24" {...p} />
          <line x1="50" y1="18" x2="68" y2="28" {...p} />
          <circle cx="50" cy="18" r="3.5" {...p} />
          <circle cx="68" cy="28" r="3.5" {...p} />
          <path d="M72 14 l8 -6 M77 6 l4 1 -1 5" {...arrow} />
        </>
      );
    case "ohp":
      return svg(
        <>
          <circle cx="48" cy="22" r="5" {...p} />
          <path d="M48 27 L48 44 L42 58 M48 44 L56 58" {...p} />
          {/* brazos arriba con barra */}
          <path d="M42 30 L40 16 M54 30 L56 16" {...p} />
          <line x1="32" y1="14" x2="64" y2="14" {...p} />
          <circle cx="32" cy="14" r="3.5" {...p} />
          <circle cx="64" cy="14" r="3.5" {...p} />
          <path d="M76 26 v-14 M73 15 l3 -4 3 4" {...arrow} />
        </>
      );
    case "fly":
      return svg(
        <>
          {/* banco */}
          <line x1="20" y1="50" x2="70" y2="50" {...p} />
          <circle cx="28" cy="42" r="5" {...p} />
          <path d="M33 44 L66 44" {...p} />
          {/* brazos en arco cerrando */}
          <path d="M46 44 q-14 -18 -22 -10" {...p} />
          <path d="M46 44 q14 -18 22 -10" {...p} />
          <circle cx="24" cy="32" r="2.5" {...p} />
          <circle cx="68" cy="32" r="2.5" {...p} />
          <path d="M34 18 q14 -8 28 0" {...arrow} />
        </>
      );
    case "dips":
      return svg(
        <>
          {/* paralelas */}
          <line x1="24" y1="24" x2="24" y2="58" {...p} />
          <line x1="68" y1="24" x2="68" y2="58" {...p} />
          <line x1="18" y1="24" x2="34" y2="24" {...p} />
          <line x1="62" y1="24" x2="74" y2="24" {...p} />
          <circle cx="46" cy="14" r="5" {...p} />
          {/* cuerpo entre barras, codos flexionados */}
          <path d="M46 19 L46 38 L40 50" {...p} />
          <path d="M42 24 L30 24 M50 24 L62 24" {...p} />
          <path d="M82 30 v12 M79 39 l3 4 3 -4" {...arrow} />
        </>
      );
    case "pullup":
      return svg(
        <>
          {/* barra alta */}
          <line x1="20" y1="10" x2="76" y2="10" {...p} />
          <circle cx="48" cy="24" r="5" {...p} />
          {/* brazos a la barra, cuerpo colgando */}
          <path d="M43 21 L38 10 M53 21 L58 10" {...p} />
          <path d="M48 29 L48 44 L42 56 M48 44 L54 56" {...p} />
          <path d="M84 34 v-12 M81 25 l3 -4 3 4" {...arrow} />
        </>
      );
    case "pulldown":
      return svg(
        <>
          {/* polea alta */}
          <line x1="30" y1="8" x2="66" y2="8" {...p} />
          <line x1="48" y1="8" x2="48" y2="14" {...arrow} />
          {/* barra del jalón */}
          <line x1="34" y1="16" x2="62" y2="16" {...p} />
          <circle cx="48" cy="30" r="5" {...p} />
          {/* brazos tirando hacia el pecho */}
          <path d="M40 16 L43 26 M56 16 L53 26" {...p} />
          <path d="M48 35 L48 46 L40 56 M48 46 L56 56" {...p} />
          <path d="M78 18 v14 M75 29 l3 4 3 -4" {...arrow} />
        </>
      );
    case "row":
      return svg(
        <>
          <circle cx="58" cy="16" r="5" {...p} />
          {/* torso inclinado */}
          <path d="M54 19 L36 30 L34 46 L26 58 M34 46 L44 58" {...p} />
          {/* brazo remando barra al torso */}
          <path d="M48 24 L50 36" {...p} />
          <line x1="40" y1="38" x2="60" y2="38" {...p} />
          <circle cx="40" cy="38" r="3.5" {...p} />
          <circle cx="60" cy="38" r="3.5" {...p} />
          <path d="M72 46 v-14 M69 35 l3 -4 3 4" {...arrow} />
        </>
      );
    case "curl":
      return svg(
        <>
          <circle cx="44" cy="12" r="5" {...p} />
          <path d="M44 17 L44 40 L38 56 M44 40 L50 56" {...p} />
          {/* brazo fijo, antebrazo curleando */}
          <path d="M44 22 L46 34" {...p} />
          <path d="M46 34 L58 26" {...p} />
          <circle cx="58" cy="26" r="3" {...p} />
          <path d="M64 42 q8 -6 2 -14 M68 31 l-2 -4 -3 4" {...arrow} />
        </>
      );
    case "triceps":
      return svg(
        <>
          {/* polea alta */}
          <line x1="34" y1="8" x2="62" y2="8" {...p} />
          <line x1="48" y1="8" x2="48" y2="18" {...arrow} />
          <circle cx="42" cy="18" r="5" {...p} />
          <path d="M42 23 L42 42 L36 56 M42 42 L48 56" {...p} />
          {/* codo fijo, antebrazo extendiendo hacia abajo */}
          <path d="M44 28 L52 30 L58 40" {...p} />
          <line x1="54" y1="42" x2="64" y2="38" {...p} />
          <path d="M72 28 v14 M69 39 l3 4 3 -4" {...arrow} />
        </>
      );
    case "lateral":
      return svg(
        <>
          {/* vista frontal */}
          <circle cx="48" cy="12" r="5" {...p} />
          <path d="M48 17 L48 40 L40 56 M48 40 L56 56" {...p} />
          {/* brazos elevándose a los lados */}
          <path d="M44 22 L28 30" {...p} />
          <path d="M52 22 L68 30" {...p} />
          <circle cx="25" cy="31" r="2.5" {...p} />
          <circle cx="71" cy="31" r="2.5" {...p} />
          <path d="M20 22 q3 -6 10 -6 M16 46 q-4 -12 4 -22" {...arrow} />
          <path d="M76 22 q-3 -6 -10 -6 M80 46 q4 -12 -4 -22" {...arrow} />
        </>
      );
    case "reardelt":
      return svg(
        <>
          <circle cx="52" cy="14" r="5" {...p} />
          {/* torso inclinado */}
          <path d="M49 17 L38 30 L36 46 L28 58 M36 46 L46 58" {...p} />
          {/* brazos abriendo hacia atrás */}
          <path d="M44 24 q-16 2 -20 12" {...p} />
          <path d="M46 26 q14 8 22 6" {...p} />
          <circle cx="22" cy="37" r="2.5" {...p} />
          <circle cx="70" cy="33" r="2.5" {...p} />
          <path d="M62 16 q10 2 12 10" {...arrow} />
        </>
      );
    case "abs":
      return svg(
        <>
          {/* crunch en el piso */}
          <line x1="14" y1="56" x2="82" y2="56" {...p} />
          <circle cx="30" cy="36" r="5" {...p} />
          {/* torso subiendo, piernas flexionadas */}
          <path d="M34 40 L50 48" {...p} />
          <path d="M50 48 L60 36 L70 52" {...p} />
          <path d="M22 26 q10 -8 20 -2 M38 20 l5 2 -3 5" {...arrow} />
        </>
      );
    case "generic":
    default:
      return svg(
        <>
          {/* mancuerna */}
          <line x1="30" y1="32" x2="66" y2="32" {...p} />
          <rect x="20" y="22" width="8" height="20" rx="2" {...p} />
          <rect x="68" y="22" width="8" height="20" rx="2" {...p} />
        </>
      );
  }
}
