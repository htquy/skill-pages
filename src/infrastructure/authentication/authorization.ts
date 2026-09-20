import { auth } from "@/src/infrastructure/authentication/auth";
import { prismaUserRepository } from "@/src/infrastructure/repositories/prisma-user-repository";
import { ForbiddenError, UnauthorizedError } from "@/src/domain/errors";
import type { CurrentUser } from "@/src/domain/identity/entities";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user || !user.id) return null;
  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const session = await auth();
  const user = session?.user;
  if (!user || !user.id) {
    throw new UnauthorizedError("You must be signed in to continue");
  }

  const record = await prismaUserRepository.findById(user.id);
  if (!record) {
    throw new UnauthorizedError("Your account is no longer available");
  }
  if (record.status !== "ACTIVE") {
    throw new ForbiddenError("Your account has been blocked");
  }
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    image: record.image,
    role: record.role,
    status: record.status,
    lastLoginAt: record.lastLoginAt,
  };
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Administrator access required");
  }
  return user;
}