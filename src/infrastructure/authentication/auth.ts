import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/infrastructure/database/prisma";
import { AuditAction } from "@/src/domain/audit";
import type { UserRole, UserStatus } from "@/src/domain/identity/entities";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.role = (user as { role?: UserRole }).role ?? "CUSTOMER";
        session.user.status = (user as { status?: UserStatus }).status ?? "ACTIVE";
        session.user.lastLoginAt = (user as { lastLoginAt?: Date | null }).lastLoginAt ?? null;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user.id) return;
      const now = new Date();
      await prisma.user
        .update({
          where: { id: user.id },
          data: { lastLoginAt: now },
        })
        .catch(() => undefined);
      await prisma.auditLog
        .create({
          data: {
            actorUserId: user.id,
            action: AuditAction.LOGIN,
            entityType: "User",
            entityId: user.id,
          },
        })
        .catch(() => undefined);
    },
  },
});