// Pruebas de la prescripción del día: cuántas series se pintan, y el
// calentamiento con series de aproximación. Sin dependencias:
//   node scripts/test-prescription.mjs
//
// Cubre el bug del "solo sale una serie" el primer día: `saveLog` recorta las
// filas vacías del final, así que el logger tiene que saber cuántas series
// pide la progresión en vez de confiar en lo último guardado.

const { buildStartGuide, buildWarmup } = await import("../lib/prescription.ts");
const { KEY_LIFTS, serializeMarks, parseMarks } = await import("../lib/key-lifts.ts");
const { findPriority, countFocused, PRIORIDADES } = await import("../lib/priority.ts");

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n       esperado ${JSON.stringify(want)}, obtuve ${JSON.stringify(got)}`); }
}

const DL = [6, 12];
const guide = (progression, week, startWeight = "135 lb") =>
  buildStartGuide({ progression, week, deloadWeeks: DL, startWeight, lastWeight: null, lastWeek: null });

console.log("\n--- series que pide cada progresión ---");
eq("COMPOUND S1 → 2×12 + AMRAP, 3 filas", [guide("COMPOUND", 1).target, guide("COMPOUND", 1).sets], ["2×12 + AMRAP −10%", 3]);
eq("COMPOUND S5 → 2×8, 3 filas", [guide("COMPOUND", 5).target, guide("COMPOUND", 5).sets], ["2×8 + AMRAP −10%", 3]);
eq("HYPER S1 → AMRAP + 2×10-12, 3 filas", [guide("HYPER", 1).target, guide("HYPER", 1).sets], ["AMRAP + 2×10-12", 3]);
eq("HYPER S2 → 4×10-12, 4 filas", [guide("HYPER", 2).target, guide("HYPER", 2).sets], ["4×10-12", 4]);
eq("HYPER S4 → 4×8-10, 4 filas", guide("HYPER", 4).sets, 4);
eq("LIGHT S1 → 4 filas", guide("LIGHT", 1).sets, 4);
eq("LIGHT S3 → 4 filas", guide("LIGHT", 3).sets, 4);
eq("AMRAP_MYO → 2 filas", guide("AMRAP_MYO", 3).sets, 2);
eq("DOMINADAS S1 → 3 filas", guide("DOMINADAS", 1).sets, 3);
eq("descarga S6 → 3×6 al 70%, 3 filas", [guide("COMPOUND", 6).target, guide("COMPOUND", 6).sets], ["3×6 al 70% — semana de descarga", 3]);
eq("descarga S6 AMRAP_MYO → 2 filas", guide("AMRAP_MYO", 6).sets, 2);
eq("progresión desconocida → 3 filas", guide(null, 1).sets, 3);

console.log("\n--- calentamiento: series de aproximación ---");
const w = buildWarmup({ exerciseName: "Hip thrust barra", progression: "COMPOUND", workingWeight: "135 lb", isDeload: false });
eq("135 lb → 4 escalones", w.sets.length, 4);
eq("135 lb → pesos 55/80/110/120", w.sets.map((s) => s.weight), ["55 lb", "80 lb", "110 lb", "120 lb"]);
eq("135 lb → esquemas", w.sets.map((s) => s.scheme), ["40% × 10", "60% × 8", "80% × 4", "90% × 2"]);
eq("ningún escalón llega al peso de trabajo", w.sets.every((s) => parseFloat(s.weight) < 135), true);
eq("los escalones suben", w.sets.every((s, i, a) => i === 0 || parseFloat(s.weight) > parseFloat(a[i - 1].weight)), true);

const light = buildWarmup({ exerciseName: "Elevaciones laterales", progression: "COMPOUND", workingWeight: "15 lb c/u", isDeload: false });
eq("peso muy liviano → no inventa escalones repetidos", new Set(light.sets.map((s) => s.weight)).size, light.sets.length);
eq("peso liviano → conserva 'c/u'", light.sets[0].weight.includes("c/u"), true);

const kg = buildWarmup({ exerciseName: "Sentadilla", progression: "COMPOUND", workingWeight: "100 kg", isDeload: false });
eq("kg → redondea a 2.5", kg.sets.map((s) => s.weight), ["40 kg", "60 kg", "80 kg", "90 kg"]);

const bw = buildWarmup({ exerciseName: "Dominadas", progression: "DOMINADAS", workingWeight: "BW+25 lb", isDeload: false });
eq("peso corporal → aproximación asistida", bw.sets.map((s) => s.scheme), ["Con banda o asistida × 6", "Sin lastre × 4"]);

const sinPeso = buildWarmup({ exerciseName: "Sentadilla", progression: "COMPOUND", workingWeight: null, isDeload: false });
eq("sin peso de referencia → igual calienta", sinPeso.sets.length, 3);
eq("sin peso → sin cifras inventadas", sinPeso.sets.every((s) => s.weight === null), true);

const dl = buildWarmup({ exerciseName: "Sentadilla", progression: "COMPOUND", workingWeight: "135 lb", isDeload: true });
eq("descarga → nota distinta", dl.general.includes("descarga"), true);

console.log("\n--- marcas del onboarding (ida y vuelta) ---");
const marks = {
  sentadilla: { reps: "10", lb: "95" },
  hip_thrust: { reps: "12", lb: "135" },
  dominadas: { reps: "5", lb: "" },
  press_banca: { reps: "", lb: "", unknown: true },
};
const txt = serializeMarks(marks);
eq("serializa reps × lb", txt.includes("Sentadilla con barra: 10 reps × 95 lb"), true);
eq("peso corporal sin lb", txt.includes("Dominadas: 5 reps con peso corporal"), true);
eq("registra lo que nunca hizo", txt.includes("Nunca ha hecho: Press de banca"), true);
const back = parseMarks(txt);
eq("round-trip sentadilla", back.sentadilla, { reps: "10", lb: "95" });
eq("round-trip hip thrust", back.hip_thrust, { reps: "12", lb: "135" });
eq("round-trip dominadas (sin lb)", back.dominadas, { reps: "5", lb: "" });
eq("round-trip 'nunca lo he hecho'", back.press_banca, { reps: "", lb: "", unknown: true });
eq("vacío → vacío", serializeMarks({}), "");
eq("parse de undefined no revienta", parseMarks(undefined), {});
eq("todos los ejercicios tienen explicación", KEY_LIFTS.every((l) => l.what.length > 30 && l.muscles), true);

console.log("\n--- prioridad muscular ---");
eq("encuentra por label", findPriority("Pierna y glúteo")?.key, "pierna");
eq("encuentra por key", findPriority("pierna")?.key, "pierna");
eq("sin prioridad → null", findPriority(undefined), null);
eq("prioridad desconocida → null", findPriority("brazos de acero"), null);
const pierna = findPriority("Pierna y glúteo");
eq(
  "cuenta las sesiones de pierna de un plan 3+2",
  countFocused(pierna, [
    { name: "LOWER A", foco: "Cuádriceps · Glúteo" },
    { name: "LOWER B", foco: "Femoral · Glúteo" },
    { name: "GLÚTEO", foco: "Glúteo · Core" },
    { name: "PUSH", foco: "Pecho · Hombro · Tríceps" },
    { name: "PULL", foco: "Espalda · Bíceps" },
  ]),
  3
);
eq(
  "cuenta el plan que le salió mal a Melissa (3 upper / 2 lower)",
  countFocused(pierna, [
    { name: "PUSH", foco: "Pecho · Hombro · Tríceps" },
    { name: "PULL", foco: "Espalda · Bíceps" },
    { name: "UPPER", foco: "Torso completo" },
    { name: "LEGS", foco: "Cuádriceps · Femoral" },
    { name: "LOWER", foco: "Glúteo · Femoral" },
  ]),
  2
);
eq("equilibrado no cuenta", countFocused(findPriority("Equilibrado"), [{ name: "FULL A" }]), null);
eq("las 4 prioridades traen regla", PRIORIDADES.every((p) => p.rule.length > 60), true);

console.log("\n--- autorización de tratamiento de datos ---");
const { hasCurrentConsent, CONSENT_VERSION, POLICY, CONSENT_SUMMARY, RESPONSABLE, DATOS_SENSIBLES } =
  await import("../lib/consent.ts");
const ayer = new Date("2026-08-28T10:00:00Z");
eq("aceptó la versión vigente → cubierto", hasCurrentConsent(ayer, CONSENT_VERSION), true);
eq("aceptó una versión anterior → NO cubierto", hasCurrentConsent(ayer, "2026-01-01"), false);
eq("sin fecha → NO cubierto", hasCurrentConsent(null, CONSENT_VERSION), false);
eq("fecha sin versión → NO cubierto", hasCurrentConsent(ayer, null), false);
eq("cuenta vieja (todo null) → NO cubierto", hasCurrentConsent(null, null), false);
// Lo que la Ley 1581 exige que el texto diga. Si alguien edita la política y
// borra una de estas secciones, esta prueba lo caza antes del deploy.
for (const id of ["responsable", "datos", "sensibles", "finalidad", "terceros", "derechos", "conservacion", "cambios", "sic"]) {
  eq(`la política trae la sección "${id}"`, POLICY.some((s) => s.id === id), true);
}
const texto = POLICY.flatMap((s) => s.body).join(" ");
eq("advierte que no está obligado a dar datos sensibles", /NO autorizar el tratamiento de tus datos sensibles/.test(texto), true);
eq("nombra los datos sensibles uno por uno", DATOS_SENSIBLES.length >= 4, true);
eq("declara la transferencia internacional", /transferencia internacional/i.test(texto), true);
eq("nombra al proveedor de IA", /Anthropic/.test(texto), true);
eq("da el canal para ejercer derechos", texto.includes(RESPONSABLE.email), true);
eq("menciona la SIC", POLICY.some((s) => s.id === "sic" && /Superintendencia/.test(s.body.join(" "))), true);
eq("el responsable tiene nombre y correo", !!RESPONSABLE.nombre && !!RESPONSABLE.email, true);
// Art. 12 Ley 1581 + Art. 13 Decreto 1377: identidad, domicilio, correo y teléfono.
eq("el responsable trae domicilio y teléfono", !!RESPONSABLE.ciudad && !!RESPONSABLE.telefono, true);
eq("el domicilio sale impreso en la política", texto.includes(RESPONSABLE.ciudad), true);
eq("el teléfono sale impreso en la política", texto.includes(RESPONSABLE.telefono), true);
eq("el resumen del checkbox avisa de los datos sensibles", CONSENT_SUMMARY.some((l) => /sensibles/i.test(l)), true);

console.log(`\n${fail === 0 ? "✅" : "❌"} ${pass} pasaron, ${fail} fallaron\n`);
process.exit(fail === 0 ? 0 : 1);
