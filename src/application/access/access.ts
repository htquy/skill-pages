import { ForbiddenError, NotFoundError } from "@/src/domain/errors";
import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { SkillAccess, SkillAccessRepository, SkillAccessView } from "@/src/domain/access";
import type { SkillRepository } from "@/src/domain/skill";

export interface AccessDeps {
  access: SkillAccessRepository;
  audit: AuditLogRepository;
  skills: SkillRepository;
}

export interface GrantAccessInput {
  userId: string;
  skillId: string;
}

export function createAccessCommands(deps: AccessDeps) {
  return {
    async hasActiveAccess(userId: string, skillId: string): Promise<boolean> {
      const active = await deps.access.findActive(userId, skillId);
      return Boolean(active);
    },

    getActiveAccess(userId: string, skillId: string): Promise<SkillAccess | null> {
      return deps.access.findActive(userId, skillId);
    },

    listActiveByUser(userId: string): Promise<SkillAccessView[]> {
      return deps.access.listActiveByUser(userId);
    },

    async grantByAdmin(admin: CurrentUser, userId: string, skillId: string): Promise<SkillAccess> {
      const skill = await deps.skills.findPurchaseInfoById(skillId);
      if (!skill) {
        throw new NotFoundError("Skill was not found");
      }
      const access = await deps.access.grant({
        userId,
        skillId,
        source: "ADMIN_GRANT",
      });
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.GRANT_SKILL_ACCESS,
        entityType: "SkillAccess",
        entityId: access.id,
        metadata: { userId, skillId },
      });
      return access;
    },

    async revokeByAdmin(admin: CurrentUser, userId: string, skillId: string): Promise<void> {
      const skill = await deps.skills.findPurchaseInfoById(skillId);
      if (!skill) {
        throw new NotFoundError("Skill was not found");
      }
      const active = await deps.access.findActive(userId, skillId);
      if (!active) {
        throw new ForbiddenError("This user does not have active access to this skill");
      }
      await deps.access.revoke(userId, skillId);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.REVOKE_SKILL_ACCESS,
        entityType: "SkillAccess",
        entityId: active.id,
        metadata: { userId, skillId },
      });
    },
  };
}