/**
 * Casos del modo flexible. Sin base de datos: la lógica de "qué sigue" es
 * pura a propósito, para poder probarla sin levantar nada.
 *
 *   node scripts/test-schedule.mjs
 */
import { strict as assert } from "node:assert";

// Réplica de lib/schedule.ts — el archivo es .ts y este runner es node puro.
function nextPendingSession(sessions, doneIds) {
  if (sessions.length === 0) return null;
  const ordered = [...sessions].sort((a, b) => a.order - b.order);
  const pending = ordered.find((s) => !doneIds.has(s.id));
  return pending
    ? { session: pending, weekComplete: false }
    : { session: ordered[0], weekComplete: true };
}
function remainingCount(sessions, doneIds) {
  return sessions.filter((s) => !doneIds.has(s.id)).length;
}

const S = [
  { id: "u", name: "UPPER", order: 0 },
  { id: "l", name: "LEGS", order: 1 },
  { id: "ps", name: "PUSH", order: 2 },
  { id: "pl", name: "PULL", order: 3 },
  { id: "lo", name: "LOWER", order: 4 },
];

let n = 0;
const t = (nombre, fn) => { fn(); n++; console.log("  ok ·", nombre); };

console.log("modo flexible · qué sesión sigue");

t("semana en blanco arranca por la primera del ciclo", () => {
  const r = nextPendingSession(S, new Set());
  assert.equal(r.session.name, "UPPER");
  assert.equal(r.weekComplete, false);
  assert.equal(remainingCount(S, new Set()), 5);
});

t("con UPPER hecha, sigue LEGS", () => {
  const r = nextPendingSession(S, new Set(["u"]));
  assert.equal(r.session.name, "LEGS");
  assert.equal(remainingCount(S, new Set(["u"])), 4);
});

t("respeta el orden del plan aunque se entrene salteado", () => {
  // Hizo PUSH primero (un miércoles suelto): lo siguiente sigue siendo UPPER,
  // porque el orden codifica la recuperación que diseñó el coach.
  const r = nextPendingSession(S, new Set(["ps"]));
  assert.equal(r.session.name, "UPPER");
});

t("el caso de JD: domingo, nada registrado, hay sesión igual", () => {
  // Antes esto devolvía "DESCANSO" y bloqueaba la vista. Ahora el día no entra
  // en la cuenta: solo importa qué falta.
  const r = nextPendingSession(S, new Set());
  assert.ok(r.session, "siempre hay una sesión que ofrecer");
  assert.equal(r.weekComplete, false);
});

t("semana completa: avisa y ofrece la primera de nuevo", () => {
  const todas = new Set(S.map((s) => s.id));
  const r = nextPendingSession(S, todas);
  assert.equal(r.weekComplete, true);
  assert.equal(r.session.name, "UPPER");
  assert.equal(remainingCount(S, todas), 0);
});

t("plan sin sesiones no revienta", () => {
  assert.equal(nextPendingSession([], new Set()), null);
});

t("orden desordenado en memoria se normaliza", () => {
  const revuelto = [...S].reverse();
  const r = nextPendingSession(revuelto, new Set(["u", "l"]));
  assert.equal(r.session.name, "PUSH");
});

console.log(`\n${n}/${n} casos en verde`);
