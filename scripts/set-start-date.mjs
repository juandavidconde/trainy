#!/usr/bin/env node
// Ajusta la fecha de inicio del bloque activo de un usuario (para recalibrar
// la "semana actual" sin re-importar el plan ni tocar los logs).
//
// Uso (con DATABASE_URL apuntando a la DB):
//   node scripts/set-start-date.mjs --email persona@ejemplo.com            # solo muestra
//   node scripts/set-start-date.mjs --email persona@ejemplo.com --set 2026-06-29T05:00:00Z
//
// Tip: la fecha debe ser el lunes de la semana 1 a medianoche LOCAL expresada
// en UTC (Bogotá = UTC-5 → medianoche = 05:00Z).

// Con `railway run --service Postgres` la URL alcanzable desde afuera es la pública
if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
const { PrismaClient } = await import("@prisma/client");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = arg("email");
const set = arg("set");

if (!email) {
  console.error("Falta --email");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  const all = await prisma.user.findMany({ select: { email: true, role: true } });
  console.error(`No existe usuario ${email}. Usuarios en la DB:`);
  for (const u of all) console.error(`  - ${u.email} (${u.role})`);
  process.exit(1);
}

const plan = await prisma.plan.findFirst({
  where: { userId: user.id, status: "ACTIVE" },
});
if (!plan) {
  console.error(`${email} no tiene plan activo`);
  process.exit(1);
}

console.log(`Plan activo: "${plan.name}" (${plan.weeks} semanas)`);
console.log(`startDate actual: ${plan.startDate?.toISOString() ?? "null"}`);

if (set) {
  const date = new Date(set);
  if (Number.isNaN(date.getTime())) {
    console.error(`Fecha inválida: ${set}`);
    process.exit(1);
  }
  await prisma.plan.update({
    where: { id: plan.id },
    data: { startDate: date },
  });
  console.log(`startDate nuevo:  ${date.toISOString()}`);
}

await prisma.$disconnect();
