import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import { NotFoundError, ValidationError } from "@/src/domain/errors";
import type { AdminUserView, CurrentUser, UserFilters, UserRepository, UserRole } from "@/src/domain/identity/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export interface UsersDeps {
  users: UserRepository;
  audit: AuditLogRepository;
}

export function createUserCommands(deps: UsersDeps) {
  return {
    listUsers(filters: UserFilters, pagination: Pagination): Promise<PaginatedResult<AdminUserView>> {
      return deps.users.listForAdmin(filters, pagination);
    },

    async blockUser(admin: CurrentUser, userId: string): Promise<void> {
      await guardNotSelf(admin, userId, "block");
      const user = await deps.users.findById(userId);
      if (!user) throw new NotFoundError("User was not found");
      if (user.status === "BLOCKED") return;
      await deps.users.setStatus(userId, "BLOCKED");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.BLOCK_USER,
        entityType: "User",
        entityId: userId,
      });
    },

    async unblockUser(admin: CurrentUser, userId: string): Promise<void> {
      const user = await deps.users.findById(userId);
      if (!user) throw new NotFoundError("User was not found");
      if (user.status === "ACTIVE") return;
      await deps.users.setStatus(userId, "ACTIVE");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UNBLOCK_USER,
        entityType: "User",
        entityId: userId,
      });
    },

    async changeRole(admin: CurrentUser, userId: string, role: UserRole): Promise<void> {
      await guardNotSelf(admin, userId, "change the role of");
      const user = await deps.users.findById(userId);
      if (!user) throw new NotFoundError("User was not found");
      if (user.role === role) return;
      await deps.users.setRole(userId, role);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.CHANGE_USER_ROLE,
        entityType: "User",
        entityId: userId,
        metadata: { from: user.role, to: role },
      });
    },
  };
}

async function guardNotSelf(admin: CurrentUser, userId: string, verb: string): Promise<void> {
  if (admin.id === userId) {
    throw new ValidationError(`You cannot ${verb} your own account`);
  }
}
