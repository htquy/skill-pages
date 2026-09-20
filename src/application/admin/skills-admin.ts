import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { PaginatedResult, Pagination } from "@/src/domain/shared";
import type { SaveSkillData, SkillAdminDetail, SkillAdminRepository, SkillAdminSummary } from "@/src/domain/skill";

export interface SkillAdminDeps {
  skills: SkillAdminRepository;
  audit: AuditLogRepository;
}

export function createSkillAdminCommands(deps: SkillAdminDeps) {
  return {
    list(
      filters: { q?: string; status?: string; accessType?: string },
      pagination: Pagination,
    ): Promise<PaginatedResult<SkillAdminSummary>> {
      return deps.skills.list(
        {
          q: filters.q,
          status: filters.status === "ALL" ? undefined : (filters.status as SkillAdminSummary["status"]),
          accessType: filters.accessType === "ALL" ? undefined : (filters.accessType as SkillAdminSummary["accessType"]),
        },
        pagination,
      );
    },

    getDetail(id: string): Promise<SkillAdminDetail | null> {
      return deps.skills.findById(id);
    },

    async create(admin: CurrentUser, data: SaveSkillData): Promise<string> {
      const id = await deps.skills.create(data, admin.id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.CREATE_SKILL,
        entityType: "Skill",
        entityId: id,
      });
      return id;
    },

    async update(admin: CurrentUser, id: string, data: SaveSkillData): Promise<void> {
      await deps.skills.update(id, data);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UPDATE_SKILL,
        entityType: "Skill",
        entityId: id,
      });
    },

    async remove(admin: CurrentUser, id: string): Promise<void> {
      await deps.skills.delete(id);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.DELETE_SKILL,
        entityType: "Skill",
        entityId: id,
      });
    },

    async publish(admin: CurrentUser, id: string): Promise<void> {
      await deps.skills.setStatus(id, "PUBLISHED");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.PUBLISH_SKILL,
        entityType: "Skill",
        entityId: id,
      });
    },

    async unpublish(admin: CurrentUser, id: string): Promise<void> {
      await deps.skills.setStatus(id, "DRAFT");
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.UNPUBLISH_SKILL,
        entityType: "Skill",
        entityId: id,
      });
    },
  };
}