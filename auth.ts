import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Google es opcional: si la instancia no configuró credenciales,
// la app funciona solo con email+password.
export const googleEnabled =
  !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    ...(googleEnabled
      ? [Google({ allowDangerousEmailAccountLinking: true })]
      : []),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? "").trim().toLowerCase();
        const password = String(creds?.password ?? "");
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  events: {
    // Mientras la instancia no tenga coach, quien entre se convierte en coach.
    // (No usamos count==1 porque el import por API puede pre-crear atletas.)
    createUser: async ({ user }) => {
      const coachExists = (await prisma.user.count({ where: { role: "COACH" } })) > 0;
      if (!coachExists && user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "COACH" } });
      }
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) token.id = user.id;
      return token;
    },
    signIn: async ({ user }) => {
      // Cubre el caso de usuario pre-creado por API que entra por primera vez
      // con Google (el adapter no dispara createUser porque el user ya existe).
      const coachExists = (await prisma.user.count({ where: { role: "COACH" } })) > 0;
      if (!coachExists && user.id) {
        await prisma.user.update({ where: { id: user.id }, data: { role: "COACH" } });
      }
      return true;
    },
    session: async ({ session, token }) => {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});

/** Usuario actual con rol, o null. Para páginas y API routes. */
export async function currentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}
