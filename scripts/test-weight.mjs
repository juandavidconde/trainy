// Pruebas de la lectura del peso, que es de donde salen las gráficas, los PRs
// y el e1RM que el Coach IA le cita al atleta. Sin dependencias: `node scripts/test-weight.mjs`.
//
// Se ejecutan sobre el TS compilado a mano acá abajo para no arrastrar un
// runner: la lógica es pura y estos son los casos que rompían antes.

// Node 23.6+ lee TypeScript directo (type stripping nativo), y lib/weight.ts es
// puro: no importa nada, así que se puede cargar tal cual.
const {
  parseWeight,
  comparableLoad,
  estimate1RM,
  dominantUnit,
  bodyweightKgFromProfile,
} = await import("../lib/weight.ts");

let pass = 0;
let fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n       esperado ${JSON.stringify(want)}, obtuve ${JSON.stringify(got)}`); }
}
function close(name, got, want, tol = 0.5) {
  const ok = got !== null && Math.abs(got - want) <= tol;
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}\n       esperado ~${want}, obtuve ${got}`); }
}

console.log("\n--- parseWeight ---");
eq("'115 lb' → 115 lb total", (({ raw, unit, total }) => ({ raw, unit, total }))(parseWeight("115 lb")), { raw: 115, unit: "lb", total: 115 });
eq("'20 kg c/u' es por lado → total 40", (({ perSide, total, unit }) => ({ perSide, total, unit }))(parseWeight("20 kg c/u")), { perSide: true, total: 40, unit: "kg" });
eq("'BW' es peso corporal sin número", (({ bodyweight, raw }) => ({ bodyweight, raw }))(parseWeight("BW")), { bodyweight: true, raw: null });
eq("'+15 lb' es lastre sobre peso corporal", (({ bodyweight, raw, unit }) => ({ bodyweight, raw, unit }))(parseWeight("+15 lb")), { bodyweight: true, raw: 15, unit: "lb" });
eq("vacío no rompe", parseWeight("").total, null);
eq("'130' sin unidad", (({ raw, unit, total }) => ({ raw, unit, total }))(parseWeight("130")), { raw: 130, unit: null, total: 130 });

console.log("\n--- comparableLoad (lo que se grafica) ---");
close("'20 kg c/u' en kg = 40", comparableLoad(parseWeight("20 kg c/u"), "kg", 80), 40);
close("'115 lb' pasado a kg ≈ 52.2", comparableLoad(parseWeight("115 lb"), "kg", 80), 52.16);
close("'BW' con atleta de 80 kg = 80", comparableLoad(parseWeight("BW"), "kg", 80), 80);
close("'+15 lb' con atleta de 80 kg ≈ 86.8", comparableLoad(parseWeight("+15 lb"), "kg", 80), 86.8);
eq("'BW' sin peso en el perfil no inventa un número", comparableLoad(parseWeight("BW"), "kg", null), null);
eq("'+15 lb' sin peso en el perfil tampoco", comparableLoad(parseWeight("+15 lb"), "kg", null), null);

console.log("\n--- estimate1RM ---");
close("100 × 10 reps ≈ 133", estimate1RM(100, 10), 133.3);
eq("reps absurdas se descartan", estimate1RM(100, 40), null);
eq("carga cero se descarta", estimate1RM(0, 8), null);

console.log("\n--- dominantUnit (la etiqueta del eje) ---");
eq("bloque en libras → lb", dominantUnit(["115 lb", "130 lb", "95 lb"]), "lb");
eq("bloque en kilos → kg", dominantUnit(["50 kg", "60 kg"]), "kg");
eq("mayoría manda", dominantUnit(["115 lb", "130 lb", "50 kg"]), "lb");
eq("sin unidades declaradas y sin plan → kg por defecto", dominantUnit(["130", "140"]), "kg");
// El caso corriente: el atleta anota "120" a secas y la unidad vive en el plan.
eq("el atleta no declara unidad → la hereda del plan", dominantUnit(["130", "140"], ["115 lb", "95 lb"]), "lb");
eq("si el atleta sí declara, manda el atleta", dominantUnit(["60 kg", "70 kg"], ["115 lb"]), "kg");

console.log("\n--- bodyweightKgFromProfile ---");
close("'82 kg' → 82", bodyweightKgFromProfile("82 kg"), 82);
close("'180 lb' → 81.6 kg", bodyweightKgFromProfile("180 lb"), 81.6);
eq("perfil vacío → null", bodyweightKgFromProfile(""), null);

console.log(`\n${"=".repeat(40)}\n${pass} ok · ${fail} fallando\n${"=".repeat(40)}`);
process.exit(fail > 0 ? 1 : 0);
