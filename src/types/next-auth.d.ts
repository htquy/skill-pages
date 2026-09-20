import type { DefaultSession } from "next-auth";
import type { UserRole, UserStatus } from "@/src/domain/identity/entities";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      lastLoginAt?: Date | null;
    } & DefaultSession["user"];
  }
}

export {};