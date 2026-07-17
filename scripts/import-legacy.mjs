#!/usr/bin/env node
// Importa datos del skill Trainy (plan.json y/o tracker_*.json) a una
// instancia de Trainy App vía API.
//
// Uso:
//   node scripts/import-legacy.mjs \
//     --url https://tu-app.up.railway.app \
//     --key $TRAINY_API_KEY \
//     --email persona@ejemplo.com \
//     [--plan ruta/plan.json] \
//     [--tracker ruta/tracker.json]
//
// El tracker acepta tanto el formato { data: {...} } como {...} directo.

import { readFile } from "node:fs/promises";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = arg("url");
const key = arg("key") ?? process.env.TRAINY_API_KEY;
const email = arg("email");
const planPath = arg("plan");
const trackerPath = arg("tracker");

if (!url || !key || !email || (!planPath && !trackerPath)) {
  console.error(
    "Faltan argumentos. Requeridos: --url, --key (o env TRAINY_API_KEY), --email y al menos --plan o --tracker."
  );
  process.exit(1);
}

async function post(path, body) {
  const res = await fetch(new URL(path, url), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`${path} → ${res.status}: ${data?.error ?? "error"}`);
  }
  return data;
}

if (planPath) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const r = await post("/api/import/plan", { user_email: email, plan });
  console.log(`✅ Plan "${r.name}" importado para ${r.user} (${r.planId})`);
}

if (trackerPath) {
  const raw = JSON.parse(await readFile(trackerPath, "utf8"));
  const data = raw.data ?? raw;
  const r = await post("/api/import/tracker", { user_email: email, data });
  console.log(
    `✅ ${r.logsWritten} logs importados` +
      (r.skipped?.length ? ` · saltados: ${r.skipped.join("; ")}` : "")
  );
}
