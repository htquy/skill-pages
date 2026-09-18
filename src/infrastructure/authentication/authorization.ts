import { auth } from "@/src/infrastructure/authentication/auth";
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
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError("You must be signed in to continue");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new ForbiddenError("Administrator access required");
  }
  return user;
}