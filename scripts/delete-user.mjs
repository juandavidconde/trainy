// Borra un usuario y todo lo suyo (planes, logs, chat) por cascade.
// Uso: railway run --service Postgres -- node scripts/delete-user.mjs --email x@y.z --yes
if (process.env.DATABASE_PUBLIC_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_PUBLIC_URL;
}
const { PrismaClient } = await import("@prisma/client");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : null;
}

const email = arg("email");
const confirmed = process.argv.includes("--yes");
if (!email) {
  console.error("Uso: node scripts/delete-user.mjs --email <email> --yes");
  process.exit(1);
}

const prisma = new PrismaClient();
const user = await prisma.user.findUnique({
  where: { email },
  include: { _count: { select: { plans: true, logs: true, chatMessages: true } } },
});
if (!user) {
  console.error(`No existe usuario ${email}`);
  await prisma.$disconnect();
  process.exit(1);
}
console.log(
  `${user.email} (${user.role}) — planes: ${user._count.plans}, logs: ${user._count.logs}, chat: ${user._count.chatMessages}`
);
if (!confirmed) {
  console.log("Dry run. Agregá --yes para borrar de verdad.");
} else {
  await prisma.user.delete({ where: { id: user.id } });
  console.log("Borrado (cascade incluido).");
}
await prisma.$disconnect();
