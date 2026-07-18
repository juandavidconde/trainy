// Generador de bloques in-app: la metodología del skill Trainy destilada en un
// prompt + tool-use con schema, para que el onboarding termine con un plan real.
import Anthropic from "@anthropic-ai/sdk";
import { AthleteProfile } from "@/lib/profile";
import { TrainyPlanJson, importPlan } from "@/lib/trainy-format";

const MODEL = process.env.COACH_MODEL ?? "claude-sonnet-5";

/** Próximo lunes en la TZ de la instancia (el bloque siempre arranca en lunes). */
function nextMonday(): string {
  const tz = process.env.APP_TZ ?? "America/Bogota";
  const now = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getTime() + i * 24 * 3600 * 1000);
    const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: tz }).format(d);
    if (day === "Mon") {
      return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
    }
  }
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
}

const PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    nombre_bloque: { type: "string", description: "Ej: 'Ago-Nov 2026 — Hipertrofia'" },
    objetivo: { type: "string" },
    split: { type: "string", description: "Ej: 'UPPER / LOWER / PUSH / PULL / LEGS'" },
    dias_semana: { type: "integer" },
    tiempo_sesion: { type: "string", description: "Ej: '60-75 min'" },
    calendario: {
      type: "object",
      description: "Día de la semana → nombre de sesión o 'DESCANSO'. Los 7 días en español: Lunes...Domingo",
      additionalProperties: { type: "string" },
    },
    sesiones: {
      type: "object",
      description: "Nombre de sesión (MAYÚSCULAS, ej PUSH, PULL, LEGS, UPPER, LOWER, FULL A) → contenido",
      additionalProperties: {
        type: "object",
        properties: {
          dia: { type: "string", description: "Día asignado, ej 'Lunes'" },
          subtitulo: { type: "string", description: "Ej: 'Pecho · Hombro · Tríceps'" },
          ejercicios: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                progresion: {
                  type: "string",
                  enum: ["COMPOUND", "HYPER", "HYPER_ALTO", "LIGHT", "AMRAP_MYO", "DOMINADAS"],
                },
                peso_s1: { type: "string", description: "Peso semana 1, ej '95 lb', 'BW', '20 lb c/u'" },
                tempo: { type: "string", description: "Ej '3-1-1-0'" },
                notas: {
                  type: "string",
                  description: "Esquema de series/reps + técnica. Ej: '2×12 + AMRAP -10%. Codos 45°.'",
                },
              },
              required: ["nombre", "progresion", "peso_s1", "notas"],
            },
          },
        },
        required: ["ejercicios"],
      },
    },
  },
  required: ["nombre_bloque", "objetivo", "split", "dias_semana", "tiempo_sesion", "calendario", "sesiones"],
};

function systemPrompt(): string {
  return `Sos el diseñador de bloques de Trainy: entrenamiento de gimnasio con pesas, periodizado. Diseñás UN bloque de 12 semanas con descargas en S6 y S12 a partir del assessment del atleta. Respondés únicamente llamando la tool publicar_plan.

## Selección de split (días × nivel)
- 3 días: Full Body A/B/A (principiante) · PPL (intermedio+)
- 4 días: Upper/Lower x2
- 5 días: PPL + Upper + Lower (recomendado intermedio+)
- 6 días: PPL x2 (solo intermedio+)
Ajustes por deporte activo (OBLIGATORIOS si aplica):
- Runner >30 km/sem → Full Body 3x, máx 1 compuesto de pierna por sesión
- Ciclista frecuente → foco cadena posterior, no redundar cuádriceps
- Fútbol u otro deporte de impacto → volumen de pierna BAJO, nada de sentadilla pesada el día previo a jugar
- Temporada competitiva → cargas de mantenimiento, no progresión agresiva

## Estructura por sesión (respetar el tiempo disponible)
- 1-2 compuestos pesados (progresion COMPOUND) + 2-4 accesorios (HYPER o HYPER_ALTO) + 1-2 aislados/finishers (LIGHT o AMRAP_MYO)
- 60 min ≈ 5-6 ejercicios · 75 min ≈ 6-7 · 45 min ≈ 4-5
- Dominadas: si el atleta las domina, incluí dominadas lastradas (progresion DOMINADAS); si no, jalón/pulldown
- Respetá lesiones SIEMPRE: elegí variantes que no comprometan la zona y anotá la precaución en notas del ejercicio

## Pesos de partida (peso_s1)
- Con PR conocido: peso_s1 ≈ carga para 12 reps a RPE 7-8 (si da 1RM: 1RM × 0.68)
- Sin PRs (principiante): estimá por % de peso corporal conservador (ej press banca ~0.5×BW hombres / 0.3×BW mujeres, sentadilla ~0.6-0.75×BW, remo ~0.5×BW) y anotá "ajustar según RPE S1"
- Mancuernas: "X lb c/u". Peso corporal: "BW". Usá lb salvo que el atleta hable en kg.

## Periodización (va en notas de cada ejercicio, formato corto)
- COMPOUND: "S1-2: 2×12+AMRAP-10% · S3-4: 2×10 · S5: 2×8 (+5lb/salto) · S6 y S12: 3×6 DESCARGA 70%"→ resumilo como "2×12→10→8 +5lb, AMRAP -10%"
- HYPER/HYPER_ALTO: 3-4 series de 8-12, AMRAP primera serie
- LIGHT: 3-4 series de 12-15 en estiramiento/aislamiento
- AMRAP_MYO: AMRAP + myo-reps
- RPE 7-8 en compuestos, nunca fallo. Fallo solo en aislados/AMRAP finales.
- Tempo por defecto 3-1-1-0 en compuestos, 2-0-1-1 en accesorios.

## Reglas duras
- Sesiones con nombres en MAYÚSCULAS. Si el split es PPL+UL usá: PUSH, PULL, LEGS, UPPER, LOWER. Full body: FULL A, FULL B, FULL C. Upper/Lower x2: UPPER A, LOWER A, UPPER B, LOWER B.
- calendario: los 7 días (Lunes a Domingo), sesiones asignadas según preferencia del atleta y recuperación (no LEGS el día después de LOWER); los libres = "DESCANSO".
- subtitulo: grupos musculares de la sesión.
- Todo en español. Nombres de ejercicios claros de gym ("Press inclinado barra (30-45°)", "Remo Pendlay", "Hip thrust barra").
- El bloque debe ser realista y cumplible: adherencia > perfección.`;
}

export interface GenerateInput {
  profile: AthleteProfile;
  dias: number;
  tiempoSesion: string;
  nombre?: string | null;
}

export async function generatePlan(input: GenerateInput): Promise<TrainyPlanJson> {
  const { profile, dias, tiempoSesion, nombre } = input;
  const anthropic = new Anthropic();

  const assessment = [
    nombre && `Nombre: ${nombre}`,
    profile.edad && `Edad: ${profile.edad}`,
    profile.sexo && `Sexo: ${profile.sexo}`,
    profile.peso && `Peso: ${profile.peso}`,
    profile.estatura && `Estatura: ${profile.estatura}`,
    profile.objetivo && `Objetivo: ${profile.objetivo}`,
    profile.experiencia && `Experiencia: ${profile.experiencia}`,
    profile.lesiones && `Lesiones/molestias: ${profile.lesiones}`,
    profile.deporte && `Deporte activo además del gym: ${profile.deporte}`,
    profile.prs && `PRs conocidos: ${profile.prs}`,
    profile.notas && `Notas: ${profile.notas}`,
    `Días de gym por semana: ${dias}`,
    `Tiempo por sesión: ${tiempoSesion}`,
  ]
    .filter(Boolean)
    .join("\n");

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: systemPrompt(),
    tools: [
      {
        name: "publicar_plan",
        description: "Publica el bloque de 12 semanas diseñado para el atleta",
        input_schema: PLAN_SCHEMA,
      },
    ],
    tool_choice: { type: "tool", name: "publicar_plan" },
    messages: [
      {
        role: "user",
        content: `Diseñá el bloque para este atleta:\n\n${assessment}`,
      },
    ],
  });

  const toolUse = res.content.find((c) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("El modelo no devolvió un plan");
  }

  const plan = toolUse.input as TrainyPlanJson;
  // Invariantes del sistema — no negociables con el modelo
  plan.semanas = 12;
  plan.descargas = [6, 12];
  plan.fecha_inicio = nextMonday();
  plan.usuario = nombre ?? undefined;
  if (!plan.nombre_bloque || !plan.sesiones || Object.keys(plan.sesiones).length === 0) {
    throw new Error("Plan generado inválido");
  }
  return plan;
}

export interface GeneratedSummary {
  planId: string;
  nombre: string;
  split: string | null;
  sesiones: { name: string; ejercicios: number }[];
  fechaInicio: string;
}

export async function generateAndImport(
  userId: string,
  input: GenerateInput
): Promise<GeneratedSummary> {
  const plan = await generatePlan(input);
  const created = await importPlan(userId, plan);
  return {
    planId: created.id,
    nombre: plan.nombre_bloque,
    split: plan.split ?? null,
    sesiones: Object.entries(plan.sesiones).map(([name, s]) => ({
      name,
      ejercicios: s.ejercicios.length,
    })),
    fechaInicio: plan.fecha_inicio ?? "",
  };
}
